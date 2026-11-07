from __future__ import annotations

from decimal import Decimal
import math

import numpy as np
import pandas as pd

MARKET_CODE_IDS: dict[str, int] = {
    "DAMBULLA": 1,
    "PETTAH_COLOMBO": 2,
    "NUWARA_ELIYA": 3,
    "KEPPETIPOLA": 4,
    "MEEGODA": 5,
    "THAMBUTTEGAMA": 6,
    "JAFFNA": 7,
}

CROP_CODE_IDS: dict[str, int] = {
    "TOMATO": 1,
    "CARROT": 2,
    "GREEN_CHILI": 3,
    "RED_ONION": 4,
}

FEATURE_COLUMNS = [
    "wholesale_price_lkr_per_kg",
    "price_lag_1d",
    "price_lag_2d",
    "price_lag_3d",
    "price_lag_7d",
    "price_lag_14d",
    "rolling_mean_7d",
    "rolling_mean_14d",
    "rolling_std_7d",
    "price_to_ma7_ratio",
    "price_to_ma14_ratio",
    "price_momentum_1d_pct",
    "price_momentum_3d_pct",
    "price_momentum_7d_pct",
    "arrival_lag_1d",
    "arrival_lag_2d",
    "arrival_lag_3d",
    "arrival_volume_tonnes",
    "rolling_mean_7d_arrivals",
    "rolling_mean_14d_arrivals",
    "arrival_surge_ratio",
    "arrival_lag1_surge_ratio",
    "arrival_momentum_1d_pct",
    "arrival_momentum_3d_pct",
    "diesel_price_lkr",
    "precipitation_mm",
    "precipitation_7d_mm",
    "forecast_rain_mm",
    "market_id_code",
    "crop_id_code",
    "day_of_week",
    "month",
    "doy_sin",
    "doy_cos",
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


def _has_calendar_gaps(result: pd.DataFrame) -> bool:
    grouped = result.groupby(["market_code", "crop_code"], sort=False)
    diffs = grouped["recorded_date"].diff()
    non_null = diffs.dropna()
    if non_null.empty:
        return False
    return bool((non_null != pd.Timedelta(days=1)).any())


def _compute_group_series_features(group: pd.DataFrame) -> pd.DataFrame:
    deduped = group.drop_duplicates(subset=["recorded_date"], keep="last").set_index(
        "recorded_date"
    )
    daily_index = pd.date_range(
        start=deduped.index.min(),
        end=deduped.index.max(),
        freq="D",
    )
    daily_price = deduped["wholesale_price_lkr_per_kg"].reindex(daily_index).ffill(
        limit=2
    )
    daily_arrivals = deduped["arrival_volume_tonnes"].reindex(daily_index).ffill(
        limit=2
    )
    daily_rain = deduped["precipitation_mm"].reindex(daily_index).fillna(0.0)

    cal = pd.DataFrame(index=daily_index)
    for lag in (1, 2, 3, 7, 14):
        cal[f"price_lag_{lag}d"] = daily_price.shift(lag)
    cal["rolling_mean_7d"] = daily_price.rolling(7, min_periods=3).mean()
    cal["rolling_mean_14d"] = daily_price.rolling(14, min_periods=3).mean()
    cal["rolling_std_7d"] = daily_price.rolling(7, min_periods=3).std(ddof=0)
    for lag in (1, 2, 3):
        cal[f"arrival_lag_{lag}d"] = daily_arrivals.shift(lag)
    cal["rolling_mean_7d_arrivals"] = daily_arrivals.rolling(
        7, min_periods=3
    ).mean()
    cal["rolling_mean_14d_arrivals"] = daily_arrivals.rolling(
        14, min_periods=3
    ).mean()
    cal["precipitation_7d_mm"] = daily_rain.rolling(7, min_periods=1).sum()

    aligned = cal.reindex(group["recorded_date"]).reset_index(drop=True)
    out = group.reset_index(drop=True).copy()
    for column in aligned.columns:
        out[column] = aligned[column].to_numpy()
    return out


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Build leakage-safe calendar-day features from data available at each date."""
    validate_price_frame(frame)

    result = frame.copy()
    result["recorded_date"] = pd.to_datetime(
        result["recorded_date"], errors="raise"
    )
    result = result.sort_values(
        ["market_code", "crop_code", "recorded_date"]
    ).reset_index(drop=True)

    if _has_calendar_gaps(result):
        parts = [
            _compute_group_series_features(group)
            for _, group in result.groupby(
                ["market_code", "crop_code"], sort=False
            )
        ]
        result = pd.concat(parts, ignore_index=True)
    else:
        grouped = result.groupby(["market_code", "crop_code"], sort=False)
        for lag in (1, 2, 3, 7, 14):
            result[f"price_lag_{lag}d"] = grouped[
                "wholesale_price_lkr_per_kg"
            ].shift(lag)
        result["rolling_mean_7d"] = grouped[
            "wholesale_price_lkr_per_kg"
        ].transform(lambda values: values.rolling(7, min_periods=3).mean())
        result["rolling_mean_14d"] = grouped[
            "wholesale_price_lkr_per_kg"
        ].transform(lambda values: values.rolling(14, min_periods=3).mean())
        result["rolling_std_7d"] = grouped[
            "wholesale_price_lkr_per_kg"
        ].transform(
            lambda values: values.rolling(7, min_periods=3).std(ddof=0)
        )
        for lag in (1, 2, 3):
            result[f"arrival_lag_{lag}d"] = grouped[
                "arrival_volume_tonnes"
            ].shift(lag)
        result["rolling_mean_7d_arrivals"] = grouped[
            "arrival_volume_tonnes"
        ].transform(lambda values: values.rolling(7, min_periods=3).mean())
        result["rolling_mean_14d_arrivals"] = grouped[
            "arrival_volume_tonnes"
        ].transform(lambda values: values.rolling(14, min_periods=3).mean())
        result["precipitation_7d_mm"] = grouped["precipitation_mm"].transform(
            lambda values: values.rolling(7, min_periods=1).sum()
        )

    result["price_to_ma7_ratio"] = (
        result["wholesale_price_lkr_per_kg"] / result["rolling_mean_7d"]
    )
    result["price_to_ma14_ratio"] = (
        result["wholesale_price_lkr_per_kg"] / result["rolling_mean_14d"]
    )
    result["price_momentum_1d_pct"] = (
        (result["wholesale_price_lkr_per_kg"] - result["price_lag_1d"])
        / result["price_lag_1d"]
        * 100.0
    )
    result["price_momentum_3d_pct"] = (
        (result["wholesale_price_lkr_per_kg"] - result["price_lag_3d"])
        / result["price_lag_3d"]
        * 100.0
    )
    result["price_momentum_7d_pct"] = (
        (result["wholesale_price_lkr_per_kg"] - result["price_lag_7d"])
        / result["price_lag_7d"]
        * 100.0
    )

    safe_ma14_arrivals = result["rolling_mean_14d_arrivals"].replace(0.0, np.nan)
    result["arrival_surge_ratio"] = (
        result["arrival_volume_tonnes"] / safe_ma14_arrivals
    )
    result["arrival_lag1_surge_ratio"] = (
        result["arrival_lag_1d"] / safe_ma14_arrivals
    )
    result["arrival_momentum_1d_pct"] = (
        (result["arrival_volume_tonnes"] - result["arrival_lag_1d"])
        / result["arrival_lag_1d"].replace(0.0, np.nan)
        * 100.0
    )
    result["arrival_momentum_3d_pct"] = (
        (result["arrival_volume_tonnes"] - result["arrival_lag_3d"])
        / result["arrival_lag_3d"].replace(0.0, np.nan)
        * 100.0
    )

    if "forecast_rain_mm" in result.columns:
        result["forecast_rain_mm"] = pd.to_numeric(
            result["forecast_rain_mm"], errors="coerce"
        ).fillna(result["precipitation_mm"])
    else:
        result["forecast_rain_mm"] = result["precipitation_mm"]

    result["market_id_code"] = (
        result["market_code"].map(MARKET_CODE_IDS).fillna(0).astype(float)
    )
    result["crop_id_code"] = (
        result["crop_code"].map(CROP_CODE_IDS).fillna(0).astype(float)
    )
    result["day_of_week"] = result["recorded_date"].dt.dayofweek
    result["month"] = result["recorded_date"].dt.month
    day_of_year = result["recorded_date"].dt.dayofyear
    result["doy_sin"] = np.sin(2.0 * np.pi * day_of_year / 365.25)
    result["doy_cos"] = np.cos(2.0 * np.pi * day_of_year / 365.25)

    return result


def add_targets(
    frame: pd.DataFrame,
    horizons: tuple[int, ...] = (2, 3),
) -> pd.DataFrame:
    """Add calendar-aligned forward-looking targets after feature construction.

    Daily rows map to the 48h and 72h horizons as 2 and 3 calendar days.
    """
    result = frame.copy()
    result["recorded_date"] = pd.to_datetime(
        result["recorded_date"], errors="raise"
    )
    if _has_calendar_gaps(result):
        lookup = result[
            ["market_code", "crop_code", "recorded_date", "wholesale_price_lkr_per_kg"]
        ].drop_duplicates(subset=["market_code", "crop_code", "recorded_date"], keep="last")
        for days in horizons:
            shifted = lookup.copy()
            shifted["recorded_date"] = shifted["recorded_date"] - pd.Timedelta(
                days=days
            )
            shifted = shifted.rename(
                columns={
                    "wholesale_price_lkr_per_kg": f"target_price_{days * 24}h"
                }
            )
            result = result.merge(
                shifted,
                on=["market_code", "crop_code", "recorded_date"],
                how="left",
            )
    else:
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
    current_dec = Decimal(str(current_price))
    predicted_dec = Decimal(str(predicted_price))
    threshold_dec = Decimal(str(threshold_pct))
    pct_change = (predicted_dec - current_dec) / current_dec * Decimal("100")
    if pct_change <= -threshold_dec:
        return "CRASH"
    if pct_change >= threshold_dec:
        return "SURGE"
    return "STABLE"
