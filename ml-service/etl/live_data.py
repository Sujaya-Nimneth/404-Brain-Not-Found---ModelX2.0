from __future__ import annotations

import csv
import io
import json
import logging
import os
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Iterable

import httpx

logger = logging.getLogger(__name__)

MAX_RESPONSE_BYTES = 25 * 1024 * 1024
MAX_ERROR_MESSAGE_CHARS = 500

HDX_DEFAULT_URL = (
    "https://data.humdata.org/dataset/"
    "0298c598-d312-4771-b564-f4ac4d831f05/resource/"
    "3638f0d6-9969-48cf-a919-1d879d037ec6/download/"
    "wfp_food_prices_lka.csv"
)

MARKET_MAPPING = {
    "Economic Centre-Dambulla": "DAMBULLA",
    "Dambulla": "DAMBULLA",
    "Dambulla (DEC)": "DAMBULLA",
    "Economic Centre-Pettah": "PETTAH_COLOMBO",
    "Pettah": "PETTAH_COLOMBO",
    "Colombo Pettah": "PETTAH_COLOMBO",
    "Nuwara Eliya": "NUWARA_ELIYA",
    "Nuwara Eliya (DEC)": "NUWARA_ELIYA",
    "Keppetipola (DEC}": "KEPPETIPOLA",
    "Keppetipola (DEC)": "KEPPETIPOLA",
    "Keppetipola": "KEPPETIPOLA",
    "Meegoda(DEC)": "MEEGODA",
    "Meegoda (DEC)": "MEEGODA",
    "Meegoda": "MEEGODA",
    "Thambuttegama": "THAMBUTTEGAMA",
    "Thambuttegama (DEC)": "THAMBUTTEGAMA",
    "Jaffna": "JAFFNA",
}

COMMODITY_MAPPING = {
    "Tomatoes": "TOMATO",
    "Tomato": "TOMATO",
    "Carrots": "CARROT",
    "Carrot": "CARROT",
    "Onions (red, local)": "RED_ONION",
    "Onions (red)": "RED_ONION",
    "Red Onion": "RED_ONION",
    "Chilies (green)": "GREEN_CHILI",
    "Chillies (green)": "GREEN_CHILI",
    "Green Chili": "GREEN_CHILI",
    "Green Chillies": "GREEN_CHILI",
}


@dataclass(frozen=True)
class PriceObservation:
    market_code: str
    crop_code: str
    recorded_date: date
    wholesale_price_lkr_per_kg: float
    source: str


@dataclass(frozen=True)
class WeatherObservation:
    market_code: str
    observation_date: date
    precipitation_mm: float
    temp_max_c: float | None
    temp_min_c: float | None
    source: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def round_half_up_2dp(value: float | Decimal | str) -> float:
    return float(
        Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )


def bound_message(
    message: str,
    max_length: int = MAX_ERROR_MESSAGE_CHARS,
) -> str:
    cleaned = " ".join(message.split())
    if len(cleaned) <= max_length:
        return cleaned
    return cleaned[: max_length - 3].rstrip() + "..."


def parse_hdx_prices(
    payload: str,
    source_label: str = "HDX_LIVE",
) -> list[PriceObservation]:
    """Map only supported WFP rows; never infer an unknown market or crop."""
    reader = csv.DictReader(io.StringIO(payload))
    required = {"date", "market", "commodity", "pricetype", "price", "unit"}
    if reader.fieldnames is None or not required.issubset(reader.fieldnames):
        raise ValueError("HDX price payload does not contain the expected columns")

    observations: dict[tuple[str, str, date], PriceObservation] = {}
    for row in reader:
        market_code = MARKET_MAPPING.get((row.get("market") or "").strip())
        crop_code = COMMODITY_MAPPING.get((row.get("commodity") or "").strip())
        price_type = (row.get("pricetype") or "").strip().lower()
        unit = (row.get("unit") or "").strip().upper()
        if not market_code or not crop_code or price_type != "wholesale":
            continue
        if unit != "KG":
            continue
        try:
            recorded_date = date.fromisoformat((row.get("date") or "").strip())
            price = float(row["price"])
        except (TypeError, ValueError):
            continue
        if price <= 0:
            continue
        key = (market_code, crop_code, recorded_date)
        observations[key] = PriceObservation(
            market_code=market_code,
            crop_code=crop_code,
            recorded_date=recorded_date,
            wholesale_price_lkr_per_kg=round_half_up_2dp(price),
            source=source_label,
        )
    return sorted(
        observations.values(),
        key=lambda item: (item.market_code, item.crop_code, item.recorded_date),
    )


def parse_open_meteo_weather(
    payload: str,
    market_code: str,
    source_label: str = "OPEN_METEO_LIVE",
) -> list[WeatherObservation]:
    body = json.loads(payload)
    daily = body["daily"]
    dates = daily["time"]
    rain = daily["precipitation_sum"]
    temp_max = daily.get("temperature_2m_max", [None] * len(dates))
    temp_min = daily.get("temperature_2m_min", [None] * len(dates))
    if not (len(dates) == len(rain) == len(temp_max) == len(temp_min)):
        raise ValueError("Open-Meteo daily arrays have inconsistent lengths")

    result: list[WeatherObservation] = []
    for day, precipitation, maximum, minimum in zip(
        dates, rain, temp_max, temp_min, strict=True
    ):
        if precipitation is None:
            continue
        parsed_max = None if maximum is None else round_half_up_2dp(maximum)
        parsed_min = None if minimum is None else round_half_up_2dp(minimum)
        if (
            parsed_max is not None
            and parsed_min is not None
            and parsed_max < parsed_min
        ):
            parsed_max, parsed_min = parsed_min, parsed_max
        result.append(
            WeatherObservation(
                market_code=market_code,
                observation_date=date.fromisoformat(day),
                precipitation_mm=max(0.0, round_half_up_2dp(precipitation)),
                temp_max_c=parsed_max,
                temp_min_c=parsed_min,
                source=source_label,
            )
        )
    return result


def fetch_text(
    url: str,
    *,
    params: dict[str, object] | None = None,
    client: httpx.Client | None = None,
    timeout_seconds: float = 30.0,
    max_bytes: int = MAX_RESPONSE_BYTES,
) -> str:
    owns_client = client is None
    active_client = client or httpx.Client(
        timeout=timeout_seconds,
        follow_redirects=True,
    )
    try:
        with active_client.stream("GET", url, params=params) as response:
            response.raise_for_status()
            chunks: list[bytes] = []
            total = 0
            for chunk in response.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(
                        f"Upstream payload exceeded {max_bytes} byte limit"
                    )
                chunks.append(chunk)
            encoding = response.encoding or "utf-8"
            return b"".join(chunks).decode(encoding, errors="replace")
    finally:
        if owns_client:
            active_client.close()


def atomic_write_text(
    path: Path,
    content: str,
    *,
    encoding: str = "utf-8",
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        temp_path.write_text(content, encoding=encoding)
        temp_path.replace(path)
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise


def read_or_write_cache(path: Path, payload: str | None) -> str | None:
    if payload is not None:
        atomic_write_text(path, payload, encoding="utf-8")
        return payload
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


def parse_cropix_prices(
    payload: str,
    source_label: str = "CROPIX_LIVE",
) -> list[PriceObservation]:
    """Parse a normalized CROPIX snapshot without assuming an HTML layout."""
    return parse_hdx_prices(payload, source_label)


def dedupe_by_key(
    observations: Iterable[PriceObservation],
) -> list[PriceObservation]:
    by_key = {
        (item.market_code, item.crop_code, item.recorded_date): item
        for item in observations
    }
    return list(by_key.values())


def dedupe_weather_by_key(
    observations: Iterable[WeatherObservation],
) -> list[WeatherObservation]:
    by_key = {
        (item.market_code, item.observation_date): item
        for item in observations
    }
    return list(by_key.values())
