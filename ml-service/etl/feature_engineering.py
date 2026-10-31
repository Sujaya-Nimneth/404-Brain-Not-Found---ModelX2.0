from __future__ import annotations

import math

import pandas as pd


FEATURE_COLUMNS = [
    "wholesale_price_lkr_per_kg",
    "price_lag_1d",
    "price_lag_3d",
    "price_lag_7d",
    "price_lag_14d",
    "rolling_mean_7d",
    "rolling_std_7d",
    "price_momentum_3d_pct",
    "arrival_lag_1d",
    "arrival_volume_tonnes",
    "rolling_mean_7d_arrivals",
    "diesel_price_lkr",
    "precipitation_mm",
    "precipitation_7d_mm",
    "day_of_week",
    "month",
]

REQUIRED_COLUMNS = {
    "market_code",
    "crop_code",
    "recorded_date",
    "wholesale_price_lkr_per_kg",
    "arrival_volume_tonnes",
    "diesel_price_lkr",
    "precipitation_mm",
}


def validate_price_frame(frame: pd.DataFrame) -> None:
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"missing required columns: {sorted(missing)}")
    if frame.empty:
        raise ValueError("price frame must not be empty")
    if frame["wholesale_price_lkr_per_kg"].le(0).any():
        raise ValueError("wholesale prices must be positive")


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Build leakage-safe features from data available at each row's date."""
    validate_price_frame(frame)

    result = frame.copy()
    result["recorded_date"] = pd.to_datetime(result["recorded_date"], errors="raise")
    result = result.sort_values(
        ["market_code", "crop_code", "recorded_date"]
    ).reset_index(drop=True)

    grouped = result.groupby(["market_code", "crop_code"], sort=False)
    result["price_lag_1d"] = grouped["wholesale_price_lkr_per_kg"].shift(1)
    result["price_lag_3d"] = grouped["wholesale_price_lkr_per_kg"].shift(3)
    result["price_lag_7d"] = grouped["wholesale_price_lkr_per_kg"].shift(7)
    result["price_lag_14d"] = grouped["wholesale_price_lkr_per_kg"].shift(14)

    result["rolling_mean_7d"] = grouped["wholesale_price_lkr_per_kg"].transform(
        lambda values: values.rolling(7, min_periods=3).mean()
    )
    result["rolling_std_7d"] = grouped["wholesale_price_lkr_per_kg"].transform(
        lambda values: values.rolling(7, min_periods=3).std(ddof=0)
    )
    result["price_momentum_3d_pct"] = (
        result["wholesale_price_lkr_per_kg"] - result["price_lag_3d"]
    ) / result["price_lag_3d"] * 100

    result["arrival_lag_1d"] = grouped["arrival_volume_tonnes"].shift(1)
    result["rolling_mean_7d_arrivals"] = grouped[
        "arrival_volume_tonnes"
    ].transform(lambda values: values.rolling(7, min_periods=3).mean())
    result["precipitation_7d_mm"] = grouped["precipitation_mm"].transform(
        lambda values: values.rolling(7, min_periods=1).sum()
    )
    result["day_of_week"] = result["recorded_date"].dt.dayofweek
    result["month"] = result["recorded_date"].dt.month

    return result


def add_targets(
    frame: pd.DataFrame,
    horizons: tuple[int, ...] = (2, 3),
) -> pd.DataFrame:
    """Add forward-looking targets after feature construction.

    Daily rows map to the 48h and 72h horizons as 2 and 3 days respectively.
    """
    result = frame.copy()
    grouped = result.groupby(["market_code", "crop_code"], sort=False)
    for days in horizons:
        result[f"target_price_{days * 24}h"] = grouped[
            "wholesale_price_lkr_per_kg"
        ].shift(-days)
    return result


def feature_ready_frame(
    frame: pd.DataFrame,
    horizons: tuple[int, ...] = (2, 3),
) -> pd.DataFrame:
    featured = add_targets(build_features(frame), horizons=horizons)
    target_columns = [f"target_price_{days * 24}h" for days in horizons]
    required_features = FEATURE_COLUMNS
    return featured.dropna(subset=required_features + target_columns).reset_index(
        drop=True
    )


def directional_symmetry(
    current_prices: pd.Series,
    actual_prices: pd.Series,
    predicted_prices: pd.Series,
) -> float:
    actual_change = actual_prices.to_numpy() - current_prices.to_numpy()
    predicted_change = predicted_prices.to_numpy() - current_prices.to_numpy()
    if len(actual_change) == 0:
        raise ValueError("directional symmetry requires at least one observation")
    correct = (actual_change * predicted_change) > 0
    return float(correct.mean() * 100)


def mean_absolute_error(actual: pd.Series, predicted: pd.Series) -> float:
    if len(actual) == 0:
        raise ValueError("MAE requires at least one observation")
    return float((actual - predicted).abs().mean())


def movement_direction(
    current_price: float,
    predicted_price: float,
    threshold_pct: float = 10.0,
) -> str:
    if not math.isfinite(current_price) or current_price <= 0:
        raise ValueError("current price must be positive and finite")
    if not math.isfinite(predicted_price) or predicted_price <= 0:
        raise ValueError("predicted price must be positive and finite")
    pct_change = (predicted_price - current_price) / current_price * 100
    if pct_change <= -threshold_pct:
        return "CRASH"
    if pct_change >= threshold_pct:
        return "SURGE"
    return "STABLE"
