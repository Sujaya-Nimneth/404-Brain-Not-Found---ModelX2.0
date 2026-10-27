from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from app.config import get_settings
from etl.feature_engineering import (
    FEATURE_COLUMNS,
    directional_symmetry,
    feature_ready_frame,
)
from etl.seed_loader import generate_demo_history
from training.evaluate import evaluate_routing_decisions, write_evaluation_report


def train(
    output_path: Path,
    metadata_path: Path,
    history: pd.DataFrame | None = None,
) -> dict[str, object]:
    settings = get_settings()
    frame = feature_ready_frame(
        history if history is not None else generate_demo_history()
    )
    frame = frame.sort_values(["recorded_date", "market_code", "crop_code"])

    unique_dates = sorted(frame["recorded_date"].unique())
    split_index = max(1, int(len(unique_dates) * 0.8))
    train_dates = set(unique_dates[:split_index])
    train = frame[frame["recorded_date"].isin(train_dates)]
    test = frame[~frame["recorded_date"].isin(train_dates)]
    if train.empty or test.empty:
        raise ValueError("training and holdout sets must both be non-empty")

    models: dict[str, RandomForestRegressor] = {}
    metrics: dict[str, dict[str, object]] = {}
    for horizon in (48, 72):
        target = f"target_price_{horizon}h"
        model = RandomForestRegressor(
            n_estimators=120,
            max_depth=8,
            min_samples_leaf=2,
            random_state=settings.random_seed,
            n_jobs=-1,
        )
        model.fit(train[FEATURE_COLUMNS], train[target])
        horizon_test = test.copy()
        horizon_test[f"prediction_{horizon}h"] = model.predict(
            horizon_test[FEATURE_COLUMNS]
        )
        models[str(horizon)] = model

        actual = horizon_test[target]
        predicted = horizon_test[f"prediction_{horizon}h"]
        current = horizon_test["price_lag_1d"]
        naive = current
        ma7 = horizon_test["rolling_mean_7d"]

        metrics[str(horizon)] = {
            "model": {
                "directional_symmetry_pct": round(
                    directional_symmetry(current, actual, predicted), 2
                ),
                "mae_lkr": round(float(mean_absolute_error(actual, predicted)), 2),
            },
            "baseline_naive": {
                "directional_symmetry_pct": round(
                    directional_symmetry(current, actual, naive), 2
                ),
                "mae_lkr": round(float(mean_absolute_error(actual, naive)), 2),
            },
            "baseline_ma7": {
                "directional_symmetry_pct": round(
                    directional_symmetry(current, actual, ma7), 2
                ),
                "mae_lkr": round(float(mean_absolute_error(actual, ma7)), 2),
            },
            "safe_margin_fpr": {
                "model": evaluate_routing_decisions(
                    horizon_test, horizon, f"prediction_{horizon}h"
                ),
                "baseline_naive": evaluate_routing_decisions(
                    horizon_test, horizon, "price_lag_1d"
                ),
                "baseline_ma7": evaluate_routing_decisions(
                    horizon_test, horizon, "rolling_mean_7d"
                ),
            },
        }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "models": models,
            "feature_columns": FEATURE_COLUMNS,
            "model_version": "rf-v1.0",
            "trained_through": str(max(train["recorded_date"])),
        },
        output_path,
    )
    report = {
        "model_version": "rf-v1.0",
        "training_rows": int(len(train)),
        "holdout_rows": int(len(test)),
        "trained_through": str(max(train["recorded_date"])),
        "holdout_start": str(min(test["recorded_date"])),
        "metrics": metrics,
    }
    write_evaluation_report(report, metadata_path)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train ATIE 48h/72h forecasters")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--metadata", type=Path)
    args = parser.parse_args()
    settings = get_settings()
    report = train(
        args.output or settings.model_path,
        args.metadata or settings.metadata_path,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
