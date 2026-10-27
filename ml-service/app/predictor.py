from __future__ import annotations

import json
import logging
import pickle
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.config import Settings
from app.schemas import (
    Direction,
    ForecastSource,
    GlutRisk,
    MarketForecast,
    PredictBatchRequest,
    PredictBatchResponse,
)
from etl.feature_engineering import FEATURE_COLUMNS, build_features, movement_direction
from etl.seed_loader import generate_demo_history

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FixtureMarket:
    current: float
    predicted_48h: float
    predicted_72h: float
    ma7: float
    glut_risk: GlutRisk
    confidence: float
    driver: str


DEMO_FIXTURE = {
    "DAMBULLA": FixtureMarket(
        current=220.0,
        predicted_48h=154.0,
        predicted_72h=155.0,
        ma7=237.76,
        glut_risk=GlutRisk.HIGH,
        confidence=0.89,
        driver="Supply glut from Northern province harvest and elevated arrivals.",
    ),
    "PETTAH_COLOMBO": FixtureMarket(
        current=170.0,
        predicted_48h=187.5,
        predicted_72h=188.5,
        ma7=171.2,
        glut_risk=GlutRisk.LOW,
        confidence=0.86,
        driver="High urban demand with constrained upcountry arrivals.",
    ),
    "KEPPETIPOLA": FixtureMarket(
        current=175.0,
        predicted_48h=165.0,
        predicted_72h=166.0,
        ma7=176.4,
        glut_risk=GlutRisk.MEDIUM,
        confidence=0.75,
        driver="Hill-country arrivals offset by elevated transit spoilage.",
    ),
    "MEEGODA": FixtureMarket(
        current=180.0,
        predicted_48h=172.0,
        predicted_72h=173.0,
        ma7=181.3,
        glut_risk=GlutRisk.LOW,
        confidence=0.74,
        driver="Western market arrivals remain close to recent demand levels.",
    ),
}


class Predictor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.artifact: dict[str, Any] | None = None
        self.metadata: dict[str, Any] = {}
        self.history = generate_demo_history()
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        try:
            self.artifact = joblib.load(self.settings.model_path)
            if not isinstance(self.artifact, dict) or "models" not in self.artifact:
                raise ValueError("model artifact has an invalid shape")
            logger.info("Loaded model artifact from %s", self.settings.model_path)
        except (
            OSError,
            ValueError,
            ImportError,
            KeyError,
            EOFError,
            pickle.UnpicklingError,
        ) as error:
            logger.warning("Model unavailable; fallback predictions enabled: %s", error)
            self.artifact = None

        if self.settings.metadata_path.exists():
            try:
                self.metadata = json.loads(
                    self.settings.metadata_path.read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError) as error:
                logger.warning("Evaluation metadata unavailable: %s", error)

    @property
    def model_loaded(self) -> bool:
        return self.artifact is not None

    @property
    def model_version(self) -> str:
        if self.artifact:
            return str(self.artifact.get("model_version", "unknown"))
        return "fallback-v1.0"

    def predict(self, request: PredictBatchRequest) -> PredictBatchResponse:
        if request.crop_code not in {"TOMATO", "CARROT", "GREEN_CHILI", "RED_ONION"}:
            raise ValueError(f"unsupported crop: {request.crop_code}")
        unknown_markets = set(request.markets).difference(DEMO_FIXTURE)
        if unknown_markets:
            raise ValueError(f"unsupported markets: {sorted(unknown_markets)}")

        source = (
            ForecastSource.MODEL
            if self.model_loaded
            else ForecastSource.FALLBACK
        )
        if self.model_loaded:
            try:
                predictions = self._model_predictions(request)
            except (KeyError, ValueError, TypeError) as error:
                logger.warning("Model inference failed; using fallback: %s", error)
                source = ForecastSource.FALLBACK
                predictions = self._fallback_predictions(request)
        else:
            predictions = self._fallback_predictions(request)

        return PredictBatchResponse(
            crop_code=request.crop_code,
            horizon_hours=request.horizon_hours,
            reference_date=request.reference_date,
            forecast_source=source,
            model_version=self.model_version if source == ForecastSource.MODEL else "fallback-v1.0",
            predictions=predictions,
        )

    def _model_predictions(
        self, request: PredictBatchRequest
    ) -> list[MarketForecast]:
        assert self.artifact is not None
        featured = build_features(self.history)
        featured = featured[
            (featured["crop_code"] == request.crop_code)
            & (featured["market_code"].isin(request.markets))
        ]
        latest_rows = (
            featured.sort_values("recorded_date")
            .groupby("market_code", sort=False)
            .tail(1)
            .set_index("market_code")
        )
        model = self.artifact["models"][str(request.horizon_hours)]
        result: list[MarketForecast] = []
        for market_code in request.markets:
            row = latest_rows.loc[market_code]
            features = row[FEATURE_COLUMNS].to_frame().T.astype(float)
            predicted = float(model.predict(features)[0])
            result.append(
                self._market_forecast(
                    market_code=market_code,
                    current=float(row["wholesale_price_lkr_per_kg"]),
                    predicted=predicted,
                    ma7=float(row["rolling_mean_7d"]),
                    source=ForecastSource.MODEL,
                )
            )
        return result

    def _fallback_predictions(
        self, request: PredictBatchRequest
    ) -> list[MarketForecast]:
        data = json.loads(
            self.settings.fallback_data_path.read_text(encoding="utf-8")
        )
        crop_data = data["markets"].get(request.crop_code)
        if crop_data is None:
            crop_data = data["markets"]["TOMATO"]
        result: list[MarketForecast] = []
        for market_code in request.markets:
            market_data = crop_data[market_code][str(request.horizon_hours)]
            current = float(market_data["current_price_lkr"])
            predicted = float(market_data["predicted_price_lkr"])
            pct_change = round((predicted - current) / current * 100, 2)
            result.append(
                MarketForecast(
                    market_code=market_code,
                    current_price_lkr=current,
                    predicted_price_lkr=predicted,
                    baseline_naive_lkr=current,
                    baseline_ma7_lkr=float(market_data["baseline_ma7_lkr"]),
                    pct_change=pct_change,
                    direction=Direction(
                        movement_direction(
                            current,
                            predicted,
                            self.settings.movement_threshold_pct,
                        )
                    ),
                    glut_risk_level=GlutRisk(market_data["glut_risk_level"]),
                    confidence_score=float(market_data["confidence_score"]),
                    primary_driver=str(market_data["primary_driver"]),
                )
            )
        return result

    def _market_forecast(
        self,
        market_code: str,
        current: float,
        predicted: float,
        ma7: float,
        source: ForecastSource,
    ) -> MarketForecast:
        fixture = DEMO_FIXTURE[market_code]
        pct_change = round((predicted - current) / current * 100, 2)
        return MarketForecast(
            market_code=market_code,
            current_price_lkr=round(current, 2),
            predicted_price_lkr=round(predicted, 2),
            baseline_naive_lkr=round(current, 2),
            baseline_ma7_lkr=round(ma7, 2),
            pct_change=pct_change,
            direction=Direction(
                movement_direction(
                    current, predicted, self.settings.movement_threshold_pct
                )
            ),
            glut_risk_level=fixture.glut_risk,
            confidence_score=fixture.confidence,
            primary_driver=fixture.driver,
        )

    def predict_demo_fixture(
        self, request: PredictBatchRequest
    ) -> PredictBatchResponse:
        if request.crop_code != "TOMATO":
            raise ValueError("the canonical demo fixture is only available for TOMATO")
        unknown = set(request.markets).difference(DEMO_FIXTURE)
        if unknown:
            raise ValueError(f"unsupported fixture markets: {sorted(unknown)}")
        predictions: list[MarketForecast] = []
        for market_code in request.markets:
            fixture = DEMO_FIXTURE[market_code]
            predicted = (
                fixture.predicted_48h
                if request.horizon_hours == 48
                else fixture.predicted_72h
            )
            predictions.append(
                MarketForecast(
                    market_code=market_code,
                    current_price_lkr=fixture.current,
                    predicted_price_lkr=predicted,
                    baseline_naive_lkr=fixture.current,
                    baseline_ma7_lkr=fixture.ma7,
                    pct_change=round(
                        (predicted - fixture.current) / fixture.current * 100, 2
                    ),
                    direction=Direction(
                        movement_direction(
                            fixture.current,
                            predicted,
                            self.settings.movement_threshold_pct,
                        )
                    ),
                    glut_risk_level=fixture.glut_risk,
                    confidence_score=fixture.confidence,
                    primary_driver=fixture.driver,
                )
            )
        return PredictBatchResponse(
            crop_code=request.crop_code,
            horizon_hours=request.horizon_hours,
            reference_date=request.reference_date,
            forecast_source=ForecastSource.DEMO_FIXTURE,
            model_version="demo-fixture-v1.0",
            predictions=predictions,
        )

    def metrics(self) -> dict[str, Any]:
        if not self.metadata:
            raise FileNotFoundError("evaluation report is unavailable")
        return self.metadata
