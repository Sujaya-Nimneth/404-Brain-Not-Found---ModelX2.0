from __future__ import annotations

import math
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import pandas as pd

ANCHOR_DATE = pd.Timestamp("2026-10-27")
ANCHOR_TAU = 540
TWO_DP = Decimal("0.01")

MARKETS: dict[str, dict[str, object]] = {
    "DAMBULLA": {
        "id": 1,
        "province": "Central",
        "price_factor": 1.07,
        "base_arrivals": 48.0,
        "rain_offset": 3.5,
        "glut_offset": 0,
    },
    "PETTAH_COLOMBO": {
        "id": 2,
        "province": "Western",
        "price_factor": 0.95,
        "base_arrivals": 88.0,
        "rain_offset": 0.5,
        "glut_offset": 18,
    },
    "NUWARA_ELIYA": {
        "id": 3,
        "province": "Central",
        "price_factor": 0.91,
        "base_arrivals": 30.0,
        "rain_offset": 5.0,
        "glut_offset": 12,
    },
    "KEPPETIPOLA": {
        "id": 4,
        "province": "Uva",
        "price_factor": 0.89,
        "base_arrivals": 28.0,
        "rain_offset": 4.5,
        "glut_offset": 24,
    },
    "MEEGODA": {
        "id": 5,
        "province": "Western",
        "price_factor": 0.93,
        "base_arrivals": 64.0,
        "rain_offset": 0.5,
        "glut_offset": 30,
    },
    "THAMBUTTEGAMA": {
        "id": 6,
        "province": "North Central",
        "price_factor": 0.90,
        "base_arrivals": 40.0,
        "rain_offset": -0.5,
        "glut_offset": 0,
    },
    "JAFFNA": {
        "id": 7,
        "province": "Northern",
        "price_factor": 0.94,
        "base_arrivals": 32.0,
        "rain_offset": -2.0,
        "glut_offset": 35,
    },
}

CROPS: dict[str, dict[str, float | int]] = {
    "TOMATO": {
        "id": 1,
        "base_price": 196.0,
        "spoilage": 1.50,
        "arrival_factor": 1.00,
        "sensitivity": 1.00,
    },
    "CARROT": {
        "id": 2,
        "base_price": 285.0,
        "spoilage": 0.75,
        "arrival_factor": 0.85,
        "sensitivity": 0.78,
    },
    "GREEN_CHILI": {
        "id": 3,
        "base_price": 650.0,
        "spoilage": 1.20,
        "arrival_factor": 0.70,
        "sensitivity": 0.90,
    },
    "RED_ONION": {
        "id": 4,
        "base_price": 390.0,
        "spoilage": 0.50,
        "arrival_factor": 1.35,
        "sensitivity": 0.68,
    },
}

MARKET_PRICE_FACTORS: dict[str, float] = {
    code: float(meta["price_factor"]) for code, meta in MARKETS.items()
}

FUEL_SCHEDULE: tuple[tuple[str, Decimal, Decimal], ...] = (
    ("2025-05-01", Decimal("292.00"), Decimal("320.00")),
    ("2025-11-01", Decimal("294.00"), Decimal("322.00")),
    ("2025-12-01", Decimal("290.00"), Decimal("318.00")),
    ("2026-01-01", Decimal("288.00"), Decimal("316.00")),
    ("2026-02-01", Decimal("285.00"), Decimal("313.00")),
    ("2026-03-01", Decimal("283.00"), Decimal("311.00")),
    ("2026-04-01", Decimal("283.00"), Decimal("311.00")),
    ("2026-05-01", Decimal("283.00"), Decimal("311.00")),
    ("2026-06-01", Decimal("285.00"), Decimal("313.00")),
    ("2026-07-01", Decimal("287.00"), Decimal("315.00")),
    ("2026-08-01", Decimal("285.00"), Decimal("313.00")),
    ("2026-09-01", Decimal("283.00"), Decimal("311.00")),
    ("2026-10-01", Decimal("283.00"), Decimal("311.00")),
)


def round_half_up_2(value: float | Decimal) -> float:
    decimal_value = (
        value if isinstance(value, Decimal) else Decimal(f"{value:.8f}")
    )
    return float(decimal_value.quantize(TWO_DP, rounding=ROUND_HALF_UP))


def fuel_prices_for_date(
    recorded_date: str | pd.Timestamp,
) -> tuple[Decimal, Decimal]:
    iso_date = pd.Timestamp(recorded_date).strftime("%Y-%m-%d")
    selected = (Decimal("283.00"), Decimal("311.00"))
    for effective_date, diesel, petrol in FUEL_SCHEDULE:
        if iso_date >= effective_date:
            selected = (diesel, petrol)
    return selected


def generate_demo_history(
    end_date: str | pd.Timestamp = "2026-10-27",
    days: int = 540,
    seed: int = 404,
) -> pd.DataFrame:
    """Generate deterministic daily market history matching db/seed.sql.

    Uses pure calendar-anchored deterministic dynamics identical to the SQL
    expressions in db/seed.sql so offline ML training, fallback snapshots, and
    seeded PostgreSQL databases share zero train-serve skew.
    """
    _ = seed  # Retained for backwards-compatible signature.
    if days < 30:
        raise ValueError("days must be at least 30")

    dates = pd.date_range(end=pd.Timestamp(end_date), periods=days, freq="D")
    rows: list[dict[str, object]] = []

    for market_code, market_meta in MARKETS.items():
        market_id = int(market_meta["id"])
        price_factor = float(market_meta["price_factor"])
        base_arrivals = float(market_meta["base_arrivals"])
        rain_offset = float(market_meta["rain_offset"])
        glut_offset = int(market_meta["glut_offset"])

        for crop_code, crop_meta in CROPS.items():
            crop_id = int(crop_meta["id"])
            base_price = float(crop_meta["base_price"])
            arrival_factor = float(crop_meta["arrival_factor"])
            sensitivity = float(crop_meta["sensitivity"])

            glut_peak = ANCHOR_TAU - glut_offset - (crop_id - 1) * 9
            shortage_peak = ANCHOR_TAU - (market_id - 2) * 8 - (crop_id - 1) * 11
            storm_peak = ANCHOR_TAU - (market_id - 1) * 7

            for recorded_date in dates:
                tau = ANCHOR_TAU - int((ANCHOR_DATE - recorded_date).days)
                day_of_year = int(recorded_date.dayofyear)

                rain_base = (
                    7.5
                    + 5.5
                    * math.sin(
                        (2.0 * math.pi * day_of_year / 365.25)
                        + market_id * 0.45
                    )
                    + rain_offset
                )
                storm_pulse = (
                    max(
                        0.0,
                        math.cos((tau - storm_peak) * 2.0 * math.pi / 48.0),
                    )
                    ** 20
                )
                precipitation = max(0.0, rain_base + 14.0 * storm_pulse)

                glut_lead = (
                    max(
                        0.0,
                        math.cos((tau - glut_peak) * 2.0 * math.pi / 42.0),
                    )
                    ** 20
                )
                glut_crash = (
                    max(
                        0.0,
                        math.cos((tau - 2.5 - glut_peak) * 2.0 * math.pi / 42.0),
                    )
                    ** 22
                )
                short_lead = (
                    max(
                        0.0,
                        math.cos((tau - shortage_peak) * 2.0 * math.pi / 48.0),
                    )
                    ** 20
                )
                short_surge = (
                    max(
                        0.0,
                        math.cos(
                            (tau - 2.5 - shortage_peak) * 2.0 * math.pi / 48.0
                        ),
                    )
                    ** 22
                )

                maha_yala = (
                    0.040
                    * math.sin(
                        2.0 * math.pi * day_of_year / 365.25 + crop_id * 0.70
                    )
                    + 0.024
                    * math.cos(
                        4.0 * math.pi * day_of_year / 365.25 + market_id * 0.35
                    )
                    + 0.022
                    * math.sin(
                        (tau + market_id * 3.0 + crop_id * 5.0)
                        * 2.0
                        * math.pi
                        / 24.0
                    )
                )
                diesel_decimal, _ = fuel_prices_for_date(recorded_date)
                diesel_price = float(diesel_decimal)
                fuel_adj = 0.08 * ((diesel_price - 283.0) / 283.0)

                arrivals = (
                    base_arrivals
                    * arrival_factor
                    * (
                        1.0
                        + 0.12
                        * math.sin(
                            (tau + market_id * 5.0 + crop_id * 3.0)
                            * 2.0
                            * math.pi
                            / 24.0
                        )
                        + 1.65 * sensitivity * glut_lead
                        - 0.48 * sensitivity * short_lead
                    )
                )
                price = (
                    base_price
                    * price_factor
                    * (
                        1.0
                        + maha_yala
                        + fuel_adj
                        + 0.08 * sensitivity * glut_lead
                        - 0.30 * sensitivity * glut_crash
                        - 0.05 * sensitivity * short_lead
                        + 0.13 * sensitivity * short_surge
                        + 0.003 * max(0.0, precipitation - 15.0)
                    )
                )

                rows.append(
                    {
                        "market_code": market_code,
                        "crop_code": crop_code,
                        "recorded_date": recorded_date,
                        "wholesale_price_lkr_per_kg": round_half_up_2(price),
                        "arrival_volume_tonnes": round_half_up_2(
                            max(2.0, arrivals)
                        ),
                        "diesel_price_lkr": diesel_price,
                        "precipitation_mm": round_half_up_2(precipitation),
                    }
                )
    return pd.DataFrame(rows)


def write_demo_history(path: Path, **kwargs: object) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    generate_demo_history(**kwargs).to_csv(path, index=False)
    return path
