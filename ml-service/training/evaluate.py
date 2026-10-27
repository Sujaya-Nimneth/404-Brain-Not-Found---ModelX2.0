from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.metrics import mean_absolute_error

from etl.feature_engineering import directional_symmetry


def evaluate_predictions(
    frame: pd.DataFrame,
    target_column: str,
    prediction_column: str,
) -> dict[str, float]:
    current = frame["price_lag_1d"]
    actual = frame[target_column]
    predicted = frame[prediction_column]
    return {
        "directional_symmetry_pct": round(
            directional_symmetry(current, actual, predicted), 2
        ),
        "mae_lkr": round(float(mean_absolute_error(actual, predicted)), 2),
    }


def safe_margin_fpr(
    recommended_alternative_realized_net: pd.Series,
    default_realized_net: pd.Series,
) -> dict[str, Any]:
    reroute_count = int(len(recommended_alternative_realized_net))
    if reroute_count == 0:
        return {
            "safe_margin_fpr_pct": None,
            "reroute_count": 0,
            "false_reroute_count": 0,
        }
    false_count = int(
        (
            recommended_alternative_realized_net.to_numpy()
            < default_realized_net.to_numpy()
        ).sum()
    )
    return {
        "safe_margin_fpr_pct": round(false_count / reroute_count * 100, 2),
        "reroute_count": reroute_count,
        "false_reroute_count": false_count,
    }


def write_evaluation_report(report: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return path
