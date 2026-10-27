from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from etl.seed_loader import generate_demo_history

logger = logging.getLogger(__name__)


def scrape_cropix(cache_path: Path | None = None) -> pd.DataFrame:
    """Return a cached CROPIX snapshot, falling back to seeded history.

    Live government scraping is intentionally isolated behind this boundary so
    its markup changes or rate limits cannot break training or API startup.
    """
    if cache_path is not None and cache_path.exists():
        try:
            frame = pd.read_csv(cache_path)
            if not frame.empty:
                return frame
        except (OSError, pd.errors.ParserError) as error:
            logger.warning("CROPIX cache read failed: %s", error)
    logger.info("CROPIX cache unavailable; using deterministic local snapshot")
    return generate_demo_history()
