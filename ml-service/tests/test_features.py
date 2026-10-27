import pandas as pd
import pytest

from etl.feature_engineering import (
    FEATURE_COLUMNS,
    build_features,
    directional_symmetry,
    feature_ready_frame,
    mean_absolute_error,
    movement_direction,
)


def sample_frame(rows: int = 40) -> pd.DataFrame:
    dates = pd.date_range("2026-01-01", periods=rows, freq="D")
    return pd.DataFrame(
        {
            "market_code": "DAMBULLA",
            "crop_code": "TOMATO",
            "recorded_date": dates,
            "wholesale_price_lkr_per_kg": [200 + index for index in range(rows)],
            "arrival_volume_tonnes": [50 + index for index in range(rows)],
            "diesel_price_lkr": 283.0,
            "precipitation_mm": [2.0 + index % 3 for index in range(rows)],
        }
    )


def test_build_features_uses_only_prior_observations():
    frame = sample_frame()
    featured = build_features(frame)

    assert featured.loc[0, "price_lag_1d"] != featured.loc[0, "price_lag_1d"]
    assert featured.loc[1, "price_lag_1d"] == 200
    assert featured.loc[2, "price_lag_3d"] != featured.loc[2, "price_lag_3d"]
    assert featured.loc[3, "price_lag_3d"] == 200
    assert set(FEATURE_COLUMNS).issubset(featured.columns)


def test_feature_ready_frame_has_both_targets_and_no_nulls():
    ready = feature_ready_frame(sample_frame())

    assert not ready.empty
    assert "target_price_48h" in ready
    assert "target_price_72h" in ready
    assert not ready[FEATURE_COLUMNS].isna().any().any()


@pytest.mark.parametrize(
    ("predicted", "expected"),
    [
        (89.99, "CRASH"),
        (90.0, "CRASH"),
        (90.01, "STABLE"),
        (109.99, "STABLE"),
        (110.0, "SURGE"),
        (110.01, "SURGE"),
    ],
)
def test_movement_direction_boundaries(predicted, expected):
    assert movement_direction(100.0, predicted) == expected


def test_directional_symmetry_counts_only_matching_non_zero_signs():
    current = pd.Series([100.0, 100.0, 100.0, 100.0])
    actual = pd.Series([110.0, 90.0, 100.0, 110.0])
    predicted = pd.Series([120.0, 80.0, 105.0, 90.0])

    assert directional_symmetry(current, actual, predicted) == pytest.approx(50.0)


def test_mean_absolute_error():
    actual = pd.Series([100.0, 120.0])
    predicted = pd.Series([90.0, 130.0])

    assert mean_absolute_error(actual, predicted) == pytest.approx(10.0)


def test_invalid_current_price_is_rejected():
    with pytest.raises(ValueError, match="positive"):
        movement_direction(0, 100)
