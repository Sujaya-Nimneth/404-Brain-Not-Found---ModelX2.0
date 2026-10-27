from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from etl.seed_loader import generate_demo_history

logger = logging.getLogger(__name__)


def load_hdx_prices(
    csv_path: Path | None,
    fallback_path: Path | None = None,
) -> pd.DataFrame:
    """Load an HDX-compatible CSV or deterministic local history.

    The normalized output contains the columns consumed by feature engineering.
    An unavailable or malformed source never blocks training or the demo.
    """
    if csv_path is not None:
        try:
            frame = pd.read_csv(csv_path)
            required = {
                "market_code",
                "crop_code",
                "recorded_date",
                "wholesale_price_lkr_per_kg",
                "arrival_volume_tonnes",
                "diesel_price_lkr",
                "precipitation_mm",
            }
            missing = required.difference(frame.columns)
            if missing:
                raise ValueError(f"HDX CSV missing columns: {sorted(missing)}")
            return frame
        except (OSError, ValueError, pd.errors.ParserError) as error:
            logger.warning("HDX load failed; using fallback: %s", error)

    if fallback_path is not None and fallback_path.exists():
        try:
            return pd.read_csv(fallback_path)
        except (OSError, pd.errors.ParserError) as error:
            logger.warning("Fallback CSV load failed; generating history: %s", error)
    return generate_demo_history()
