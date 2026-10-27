import pandas as pd
import pytest

from training.evaluate import (
    evaluate_predictions,
    evaluate_routing_matrix,
    evaluate_routing_decisions,
    safe_margin_fpr,
)


def test_evaluate_predictions_returns_ds_and_mae():
    frame = pd.DataFrame(
        {
            "price_lag_1d": [100.0, 100.0],
            "target_price_48h": [110.0, 90.0],
            "prediction_48h": [120.0, 80.0],
        }
    )
    result = evaluate_predictions(frame, "target_price_48h", "prediction_48h")

    assert result["directional_symmetry_pct"] == pytest.approx(100.0)
    assert result["mae_lkr"] == pytest.approx(10.0)


def test_safe_margin_fpr_returns_null_for_no_reroutes():
    result = safe_margin_fpr(pd.Series(dtype=float), pd.Series(dtype=float))

    assert result == {
        "safe_margin_fpr_pct": None,
        "reroute_count": 0,
        "false_reroute_count": 0,
    }


def test_safe_margin_fpr_counts_realized_underperformance():
    result = safe_margin_fpr(
        recommended_alternative_realized_net=pd.Series([120.0, 90.0, 80.0, 150.0]),
        default_realized_net=pd.Series([100.0, 100.0, 100.0, 100.0]),
    )

    assert result["reroute_count"] == 4
    assert result["false_reroute_count"] == 2
    assert result["safe_margin_fpr_pct"] == pytest.approx(50.0)


def test_routing_backtest_uses_realized_prices_for_settlement():
    markets = [
        "DAMBULLA",
        "PETTAH_COLOMBO",
        "NUWARA_ELIYA",
        "KEPPETIPOLA",
        "MEEGODA",
        "THAMBUTTEGAMA",
        "JAFFNA",
    ]
    rows = []
    for market_code in markets:
        is_default = market_code == "DAMBULLA"
        is_alternative = market_code == "PETTAH_COLOMBO"
        current = 100.0 if is_default else 120.0
        predicted = (
            100.0
            if is_default
            else 180.0 if is_alternative else 90.0
        )
        realized = (
            100.0
            if is_default
            else 90.0 if is_alternative else 80.0
        )
        rows.append(
            {
                "recorded_date": pd.Timestamp("2026-09-01"),
                "market_code": market_code,
                "crop_code": "TOMATO",
                "price_lag_1d": current,
                "target_price_48h": realized,
                "prediction_48h": predicted,
            }
        )

    result = evaluate_routing_decisions(
        pd.DataFrame(rows), 48, "prediction_48h"
    )

    assert result["reroute_count"] == 1
    assert result["false_reroute_count"] == 1
    assert result["safe_margin_fpr_pct"] == pytest.approx(100.0)


def test_routing_backtest_skips_incomplete_market_snapshots():
    frame = pd.DataFrame(
        [
            {
                "recorded_date": pd.Timestamp("2026-09-01"),
                "market_code": "DAMBULLA",
                "crop_code": "TOMATO",
                "price_lag_1d": 100.0,
                "target_price_48h": 100.0,
                "prediction_48h": 100.0,
            }
        ]
    )

    result = evaluate_routing_decisions(frame, 48, "prediction_48h")

    assert result == {
        "safe_margin_fpr_pct": None,
        "reroute_count": 0,
        "false_reroute_count": 0,
    }


def test_routing_matrix_covers_origins_vehicles_and_quantities():
    frame = pd.DataFrame(
        [
            {
                "recorded_date": pd.Timestamp("2026-09-01"),
                "market_code": "DAMBULLA",
                "crop_code": "TOMATO",
                "price_lag_1d": 100.0,
                "target_price_48h": 100.0,
                "prediction_48h": 100.0,
            }
        ]
    )

    result = evaluate_routing_matrix(frame, 48, "prediction_48h")

    assert result["scenario_count"] == 60
    assert len(result["scenarios"]) == 60
    assert result["reroute_count"] == 0
    assert result["safe_margin_fpr_pct"] is None
    assert {
        scenario["origin"] for scenario in result["scenarios"]
    } == {"ANURADHAPURA", "JAFFNA", "DAMBULLA", "NUWARA_ELIYA", "THAMBUTTEGAMA"}
