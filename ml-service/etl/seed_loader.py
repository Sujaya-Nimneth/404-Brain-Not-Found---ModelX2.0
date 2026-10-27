from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


MARKETS = {
    "DAMBULLA": {"province": "Central", "rain_offset": 4.0},
    "PETTAH_COLOMBO": {"province": "Western", "rain_offset": 0.0},
    "NUWARA_ELIYA": {"province": "Central", "rain_offset": 4.0},
    "KEPPETIPOLA": {"province": "Uva", "rain_offset": 4.0},
    "MEEGODA": {"province": "Western", "rain_offset": 0.0},
    "THAMBUTTEGAMA": {"province": "North Central", "rain_offset": 0.0},
    "JAFFNA": {"province": "Northern", "rain_offset": -2.0},
}

CROPS = {
    "TOMATO": {"base_price": 190.0, "spoilage": 1.5},
    "CARROT": {"base_price": 280.0, "spoilage": 0.75},
    "GREEN_CHILI": {"base_price": 650.0, "spoilage": 1.2},
    "RED_ONION": {"base_price": 390.0, "spoilage": 0.5},
}

MARKET_PRICE_FACTORS = {
    "DAMBULLA": 1.00,
    "PETTAH_COLOMBO": 1.08,
    "NUWARA_ELIYA": 0.98,
    "KEPPETIPOLA": 0.96,
    "MEEGODA": 1.02,
    "THAMBUTTEGAMA": 0.99,
    "JAFFNA": 1.04,
}


def generate_demo_history(
    end_date: str | pd.Timestamp = "2026-10-27",
    days: int = 540,
    seed: int = 404,
) -> pd.DataFrame:
    """Generate deterministic daily market history matching db/seed.sql.

    This local snapshot keeps ML training and fallback inference independent of
    a running PostgreSQL instance or external data source.
    """
    if days < 30:
        raise ValueError("days must be at least 30")

    dates = pd.date_range(end=pd.Timestamp(end_date), periods=days, freq="D")
    rng = np.random.default_rng(seed)
    rows: list[dict[str, object]] = []
    market_codes = list(MARKETS)
    crop_codes = list(CROPS)

    for market_index, market_code in enumerate(market_codes):
        for crop_index, crop_code in enumerate(crop_codes):
            base_price = CROPS[crop_code]["base_price"]
            price_factor = MARKET_PRICE_FACTORS[market_code]
            noise_scale = 0.018 if crop_code == "TOMATO" else 0.012
            for date_index, recorded_date in enumerate(dates):
                day_number = date_index + 1
                daily_shock = float(rng.normal(0.0, noise_scale))
                price = (
                    base_price
                    * price_factor
                    * (
                        1
                        + 0.055
                        * np.sin(
                            (day_number + (market_index + 1) * 11.0)
                            * np.pi
                            / 31.0
                        )
                        + 0.022
                        * np.cos(
                            (day_number + (crop_index + 1) * 17.0)
                            * np.pi
                            / 23.0
                        )
                    )
                    * (1 + daily_shock)
                )
                arrivals = (
                    30
                    + crop_index * 8
                    + market_index * 5
                    + 12
                    * np.sin(
                        (day_number + (market_index + 1) * 7.0)
                        * np.pi
                        / 29.0
                    )
                )
                if (
                    market_code == "DAMBULLA"
                    and crop_code == "TOMATO"
                    and date_index >= days - 10
                ):
                    days_ahead = days - 1 - date_index
                    glut_curve = max(0.0, (10 - days_ahead) / 10)
                    price = (
                        220.0
                        * (1 + days_ahead * 0.032)
                        * (1 - glut_curve * 0.08)
                        * (1 + daily_shock * 0.25)
                    )
                    arrivals = 125.0 + days_ahead * 4.5

                precipitation = max(
                    0.0,
                    8.0
                    + 7.0
                    * np.sin(
                        (day_number + (market_index + 1) * 13.0)
                        * np.pi
                        / 27.0
                    )
                    + MARKETS[market_code]["rain_offset"],
                )
                rows.append(
                    {
                        "market_code": market_code,
                        "crop_code": crop_code,
                        "recorded_date": recorded_date,
                        "wholesale_price_lkr_per_kg": round(float(price), 2),
                        "arrival_volume_tonnes": round(
                            max(1.0, float(arrivals)), 2
                        ),
                        "diesel_price_lkr": 283.0,
                        "precipitation_mm": round(float(precipitation), 2),
                    }
                )
    return pd.DataFrame(rows)


def write_demo_history(path: Path, **kwargs: object) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    generate_demo_history(**kwargs).to_csv(path, index=False)
    return path
