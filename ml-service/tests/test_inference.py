from datetime import date

import joblib
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.predictor import DEMO_FIXTURE, Predictor
from app.schemas import PredictBatchRequest


CANONICAL_REQUEST = PredictBatchRequest(
    crop_code="TOMATO",
    horizon_hours=48,
    reference_date=date(2026, 10, 27),
    markets=[
        "DAMBULLA",
        "PETTAH_COLOMBO",
        "NUWARA_ELIYA",
        "KEPPETIPOLA",
        "MEEGODA",
        "THAMBUTTEGAMA",
        "JAFFNA",
    ],
)


def test_demo_fixture_is_explicit_and_exact(tmp_path):
    settings = Settings(model_path=tmp_path / "missing.joblib")
    predictor = Predictor(settings)
    response = predictor.predict_demo_fixture(CANONICAL_REQUEST)

    assert response.forecast_source.value == "DEMO_FIXTURE"
    by_market = {item.market_code: item for item in response.predictions}
    assert by_market["DAMBULLA"].predicted_price_lkr == 154.0
    assert by_market["DAMBULLA"].pct_change == -30.0
    assert by_market["DAMBULLA"].direction.value == "CRASH"
    assert by_market["PETTAH_COLOMBO"].direction.value == "SURGE"


def test_fallback_is_labeled_when_artifact_is_missing(tmp_path):
    settings = Settings(model_path=tmp_path / "missing.joblib")
    predictor = Predictor(settings)
    response = predictor.predict(CANONICAL_REQUEST)

    assert response.forecast_source.value == "FALLBACK"
    assert len(response.predictions) == 7
    assert {item.market_code for item in response.predictions} == set(
        CANONICAL_REQUEST.markets
    )


def test_health_reports_model_state(tmp_path):
    settings = Settings(model_path=tmp_path / "missing.joblib")
    app.state.predictor = Predictor(settings)
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "UP",
        "model_loaded": False,
        "model_version": "fallback-v1.0",
    }


def test_demo_endpoint_requires_explicit_query_flag():
    settings = Settings(model_path=Settings().model_path)
    app.state.predictor = Predictor(settings)
    payload = CANONICAL_REQUEST.model_dump(mode="json")
    with TestClient(app) as client:
        fallback_response = client.post("/predict-batch", json=payload)
        fixture_response = client.post(
            "/predict-batch?demo_mode=true", json=payload
        )

    assert fallback_response.status_code == 200
    assert fallback_response.json()["forecast_source"] in {"MODEL", "FALLBACK"}
    assert fixture_response.status_code == 200
    assert fixture_response.json()["forecast_source"] == "DEMO_FIXTURE"


def test_invalid_horizon_is_rejected():
    with pytest.raises(ValueError):
        PredictBatchRequest(
            crop_code="TOMATO",
            horizon_hours=24,
            reference_date=date(2026, 10, 27),
            markets=["DAMBULLA"],
        )


def test_demo_fixture_rejects_non_tomato():
    predictor = Predictor(Settings())
    request = CANONICAL_REQUEST.model_copy(update={"crop_code": "CARROT"})
    with pytest.raises(ValueError, match="TOMATO"):
        predictor.predict_demo_fixture(request)


def test_missing_model_falls_back_even_if_artifact_is_corrupt(tmp_path):
    corrupt = tmp_path / "corrupt.joblib"
    corrupt.write_bytes(b"not-a-joblib-artifact")
    predictor = Predictor(Settings(model_path=corrupt))
    assert not predictor.model_loaded
    response = predictor.predict(CANONICAL_REQUEST)
    assert response.forecast_source.value == "FALLBACK"


@pytest.mark.parametrize("crop_code", ["TOMATO", "CARROT", "GREEN_CHILI", "RED_ONION"])
@pytest.mark.parametrize("horizon_hours", [48, 72])
def test_fallback_covers_every_crop_and_horizon(tmp_path, crop_code, horizon_hours):
    predictor = Predictor(Settings(model_path=tmp_path / "missing.joblib"))
    request = CANONICAL_REQUEST.model_copy(
        update={"crop_code": crop_code, "horizon_hours": horizon_hours}
    )

    response = predictor.predict(request)

    assert response.forecast_source.value == "FALLBACK"
    assert len(response.predictions) == 7
    assert all(item.predicted_price_lkr > 0 for item in response.predictions)


def test_incomplete_fallback_snapshot_returns_controlled_error(tmp_path):
    snapshot = tmp_path / "fallback.json"
    snapshot.write_text('{"markets": {"TOMATO": {}}}', encoding="utf-8")
    predictor = Predictor(
        Settings(
            model_path=tmp_path / "missing.joblib",
            fallback_data_path=snapshot,
        )
    )

    with pytest.raises(ValueError, match="unavailable or incomplete"):
        predictor.predict(CANONICAL_REQUEST)
