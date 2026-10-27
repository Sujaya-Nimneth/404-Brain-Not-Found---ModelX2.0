from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query

from app.config import get_settings
from app.predictor import Predictor
from app.schemas import (
    HealthResponse,
    PredictBatchRequest,
    PredictBatchResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not hasattr(app.state, "predictor"):
        app.state.predictor = Predictor(get_settings())
    yield


app = FastAPI(
    title="ATIE ML Forecast Service",
    version="1.0.0",
    lifespan=lifespan,
)


def predictor() -> Predictor:
    return app.state.predictor


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    service = predictor()
    return HealthResponse(
        status="UP",
        model_loaded=service.model_loaded,
        model_version=service.model_version,
    )


@app.get("/metrics")
def metrics():
    try:
        return predictor().metrics()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/predict-batch", response_model=PredictBatchResponse)
def predict_batch(
    request: PredictBatchRequest,
    demo_mode: bool = Query(default=False),
) -> PredictBatchResponse:
    try:
        if demo_mode:
            return predictor().predict_demo_fixture(request)
        return predictor().predict(request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
