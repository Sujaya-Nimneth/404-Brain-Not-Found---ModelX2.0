import pandas as pd
import pytest

from training.evaluate import evaluate_predictions, safe_margin_fpr


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
