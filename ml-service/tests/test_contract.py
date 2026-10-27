from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.predictor import Predictor
from training.evaluate import evaluate_routing_decisions


ROOT = Path(__file__).resolve().parents[1]


def test_canonical_fixture_matches_cross_service_contract():
    predictor = Predictor(Settings(model_path=ROOT / "models" / "atie_forecaster.joblib"))
    payload = {
        "crop_code": "TOMATO",
        "horizon_hours": 48,
        "reference_date": "2026-10-27",
        "markets": [
            "DAMBULLA",
            "PETTAH_COLOMBO",
            "NUWARA_ELIYA",
            "KEPPETIPOLA",
            "MEEGODA",
            "THAMBUTTEGAMA",
            "JAFFNA",
        ],
    }
    app.state.predictor = predictor

    with TestClient(app) as client:
        response = client.post("/predict-batch?demo_mode=true", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["forecast_source"] == "DEMO_FIXTURE"
    dambulla = next(
        item for item in body["predictions"] if item["market_code"] == "DAMBULLA"
    )
    pettah = next(
        item
        for item in body["predictions"]
        if item["market_code"] == "PETTAH_COLOMBO"
    )
    assert dambulla["predicted_price_lkr"] == 154.0
    assert dambulla["pct_change"] == -30.0
    assert dambulla["direction"] == "CRASH"
    assert pettah["predicted_price_lkr"] == 187.5
    assert pettah["direction"] == "SURGE"


def test_metrics_expose_all_forecasters_and_nullable_fpr():
    predictor = Predictor(Settings())
    metrics = predictor.metrics()

    for horizon in ("48", "72"):
        report = metrics["metrics"][horizon]
        assert {"model", "baseline_naive", "baseline_ma7"}.issubset(report)
        for forecaster in ("model", "baseline_naive", "baseline_ma7"):
            fpr = report["safe_margin_fpr"][forecaster]
            assert set(fpr) == {
                "safe_margin_fpr_pct",
                "reroute_count",
                "false_reroute_count",
                "scenario_count",
                "scenarios",
            }
            assert fpr["scenario_count"] == len(fpr["scenarios"])
            if fpr["reroute_count"] == 0:
                assert fpr["safe_margin_fpr_pct"] is None


def test_routing_backtest_requires_all_markets_before_scoring():
    import pandas as pd

    frame = pd.DataFrame(
        [
            {
                "recorded_date": date(2026, 10, 27),
                "market_code": "DAMBULLA",
                "crop_code": "TOMATO",
                "price_lag_1d": 220.0,
                "target_price_48h": 154.0,
                "prediction_48h": 154.0,
            }
        ]
    )
    assert evaluate_routing_decisions(frame, 48, "prediction_48h") == {
        "safe_margin_fpr_pct": None,
        "reroute_count": 0,
        "false_reroute_count": 0,
    }


def test_safe_margin_uses_decimal_floor_and_percentage():
    from training.routing import passes_safe_margin

    assert not passes_safe_margin(
        Decimal("104.99"),
        Decimal("100"),
        Decimal("5"),
        Decimal("1"),
    )
    assert not passes_safe_margin(
        Decimal("106"),
        Decimal("100"),
        Decimal("5"),
        Decimal("10"),
    )
    assert passes_safe_margin(
        Decimal("106"),
        Decimal("100"),
        Decimal("5"),
        Decimal("1"),
    )
