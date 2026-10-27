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
    "NUWARA_ELIYA": FixtureMarket(
        current=185.0,
        predicted_48h=182.0,
        predicted_72h=183.0,
        ma7=186.1,
        glut_risk=GlutRisk.MEDIUM,
        confidence=0.72,
        driver="Upcountry arrivals remain close to seasonal demand.",
    ),
    "THAMBUTTEGAMA": FixtureMarket(
        current=190.0,
        predicted_48h=174.0,
        predicted_72h=175.0,
        ma7=191.2,
        glut_risk=GlutRisk.HIGH,
        confidence=0.78,
        driver="Northern and North Central arrivals are elevating supply.",
    ),
    "JAFFNA": FixtureMarket(
        current=160.0,
        predicted_48h=158.0,
        predicted_72h=159.0,
        ma7=161.4,
        glut_risk=GlutRisk.LOW,
        confidence=0.7,
        driver="Local demand is balanced against steady arrivals.",
    ),
}


class Predictor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.artifact: dict[str, Any] | None = None
        self.metadata: dict[str, Any] = {}
        self.history = generate_demo_history()
        self._feature_frame: pd.DataFrame | None = None
        self._latest_rows: pd.DataFrame | None = None
        self._load_artifacts()
        self._configure_model_runtime()
        self._prepare_feature_cache()

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

    def _configure_model_runtime(self) -> None:
        if not self.artifact:
            return
        models = self.artifact.get("models", {})
        if not isinstance(models, dict):
            return
        for model in models.values():
            # Small batch inference is faster without process/thread pool setup.
            if hasattr(model, "n_jobs"):
                model.n_jobs = 1

    @property
    def model_loaded(self) -> bool:
        return self.artifact is not None

    @property
    def model_version(self) -> str:
        if self.artifact:
            return str(self.artifact.get("model_version", "unknown"))
        return "fallback-v1.0"

    def _prepare_feature_cache(self) -> None:
        """Build feature history once; inference only slices the latest rows."""
        if not self.model_loaded:
            return
        try:
            featured = build_features(self.history)
            self._feature_frame = featured
            self._latest_rows = (
                featured.sort_values("recorded_date")
                .groupby(["market_code", "crop_code"], sort=False)
                .tail(1)
                .set_index(["market_code", "crop_code"])
            )
        except (KeyError, TypeError, ValueError) as error:
            logger.warning("Feature cache unavailable; requests will fall back: %s", error)
            self._feature_frame = None
            self._latest_rows = None

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
        if self._latest_rows is None:
            raise ValueError("feature cache is unavailable")
        model = self.artifact["models"][str(request.horizon_hours)]
        rows: list[pd.Series] = []
        for market_code in request.markets:
            row = self._latest_rows.loc[(market_code, request.crop_code)]
            rows.append(row)
        feature_matrix = pd.DataFrame(
            [row[FEATURE_COLUMNS].to_numpy(dtype=float) for row in rows],
            columns=FEATURE_COLUMNS,
        )
        predicted_prices = model.predict(feature_matrix)

        result: list[MarketForecast] = []
        for market_code, row, predicted in zip(
            request.markets,
            rows,
            predicted_prices,
            strict=True,
        ):
            result.append(
                self._market_forecast(
                    market_code=market_code,
                    current=float(row["wholesale_price_lkr_per_kg"]),
                    predicted=float(predicted),
                    ma7=float(row["rolling_mean_7d"]),
                    source=ForecastSource.MODEL,
                )
            )
        return result

    def _fallback_predictions(
        self, request: PredictBatchRequest
    ) -> list[MarketForecast]:
        try:
            data = json.loads(
                self.settings.fallback_data_path.read_text(encoding="utf-8")
            )
            crop_data = data["markets"][request.crop_code]
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
        except (
            OSError,
            json.JSONDecodeError,
            KeyError,
            TypeError,
            ValueError,
        ) as error:
            raise ValueError(
                "fallback forecast snapshot is unavailable or incomplete"
            ) from error

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
