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
    assert body["input_data_state"] == "SEED"
    assert body["reference_date"] == "2026-10-27"
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


def test_ingestion_schema_ddl_is_consolidated_and_reentrant():
    repo_root = ROOT.parent
    init_sql = (repo_root / "db" / "init.sql").read_text(encoding="utf-8")
    ingestion_sql = (repo_root / "db" / "ingestion_schema.sql").read_text(
        encoding="utf-8"
    )
    migration_sql = (
        repo_root / "db" / "migrations" / "001_ingestion_schema.sql"
    ).read_text(encoding="utf-8")

    assert ingestion_sql == migration_sql
    assert "DROP TABLE IF EXISTS data_ingestion_runs;" in init_sql
    assert "DROP TABLE IF EXISTS data_source_status;" in init_sql
    assert "CREATE OR REPLACE FUNCTION atie_source_priority" in init_sql
    assert "DEFAULT 'HDX_SEED'" in init_sql


def test_evaluation_origins_match_versioned_origin_config():
    import json
    from training.evaluate import EVALUATION_ORIGINS

    origins_path = (
        ROOT.parent / "backend" / "src" / "main" / "resources" / "origins.json"
    )
    payload = json.loads(origins_path.read_text(encoding="utf-8"))
    configured_codes = tuple(item["code"] for item in payload["origins"])

    assert payload["version"] == "1.0"
    assert EVALUATION_ORIGINS == configured_codes


def test_fallback_snapshots_match_across_services_and_separate_demo_fixture():
    from app.schemas import PredictBatchRequest

    ml_fallback = ROOT / "data" / "fallback_forecasts.json"
    backend_fallback = (
        ROOT.parent
        / "backend"
        / "src"
        / "main"
        / "resources"
        / "fallback_forecasts.json"
    )
    assert ml_fallback.read_bytes() == backend_fallback.read_bytes()

    predictor = Predictor(
        Settings(model_path=ROOT / "models" / "does_not_exist.joblib")
    )
    request = PredictBatchRequest(
        crop_code="TOMATO",
        horizon_hours=48,
        reference_date=date(2026, 10, 27),
        markets=["DAMBULLA", "PETTAH_COLOMBO"],
    )
    live_fallback = predictor.predict(request)
    demo_fixture = predictor.predict_demo_fixture(request)

    assert live_fallback.forecast_source.value == "FALLBACK"
    assert demo_fixture.forecast_source.value == "DEMO_FIXTURE"
    assert (
        live_fallback.predictions[0].predicted_price_lkr
        != demo_fixture.predictions[0].predicted_price_lkr
    )
    assert demo_fixture.predictions[0].predicted_price_lkr == 154.0


def test_evaluate_routes_match_seed_sql_routes():
    import re
    from training.evaluate import ROUTES

    seed_sql = (ROOT.parent / "db" / "seed.sql").read_text(encoding="utf-8")
    pattern = re.compile(
        r"\('([A-Z_]+)',\s*'([A-Z_]+)',\s*([0-9.]+),\s*[0-9.]+,\s*([0-9.]+)\)"
    )
    sql_routes = {
        (origin, market): (Decimal(dist), Decimal(terrain))
        for origin, market, dist, terrain in pattern.findall(seed_sql)
        if origin in ROUTES
    }
    py_routes = {
        (origin, market): (route.distance_km, route.terrain_factor)
        for origin, destinations in ROUTES.items()
        for market, route in destinations.items()
    }
    assert len(sql_routes) == 35
    assert py_routes == sql_routes


def test_demo_fixture_72h_confidence_matches_fallback_snapshot():
    import json
    from app.schemas import PredictBatchRequest

    snapshot = json.loads(
        (ROOT / "data" / "fallback_forecasts.json").read_text(encoding="utf-8")
    )
    predictor = Predictor(Settings())
    response = predictor.predict_demo_fixture(
        PredictBatchRequest(
            crop_code="TOMATO",
            horizon_hours=72,
            reference_date=date(2026, 10, 27),
            markets=list(snapshot["demo_fixture"]["TOMATO"].keys()),
        )
    )
    for item in response.predictions:
        expected = snapshot["demo_fixture"]["TOMATO"][item.market_code]["72"][
            "confidence_score"
        ]
        assert item.confidence_score == pytest.approx(expected)


def test_live_model_canonical_scenario_detects_glut_and_reroutes_to_pettah():
    from app.schemas import PredictBatchRequest
    from training.evaluate import ROUTES
    from training.routing import VEHICLES, calculate_profit, select_reroute

    predictor = Predictor(Settings())
    assert predictor.model_loaded
    request = PredictBatchRequest(
        crop_code="TOMATO",
        horizon_hours=48,
        reference_date=date(2026, 10, 27),
        markets=list(ROUTES["ANURADHAPURA"].keys()),
    )
    response = predictor.predict(request)
    assert response.forecast_source.value == "MODEL"
    by_market = {item.market_code: item for item in response.predictions}
    assert by_market["DAMBULLA"].direction.value == "CRASH"
    assert by_market["DAMBULLA"].glut_risk_level.value == "HIGH"
    assert by_market["PETTAH_COLOMBO"].direction.value == "SURGE"

    net_profits = {
        code: calculate_profit(
            Decimal(str(forecast.predicted_price_lkr)),
            Decimal("1000"),
            ROUTES["ANURADHAPURA"][code],
            VEHICLES["MINI_TRUCK_BATTA"],
            Decimal("283.00"),
            Decimal("311.00"),
            Decimal("1.50"),
        ).net_profit_lkr
        for code, forecast in by_market.items()
    }
    recommended = select_reroute(
        "DAMBULLA", net_profits, Decimal("5.0"), Decimal("1000.00")
    )
    assert recommended == "PETTAH_COLOMBO"


