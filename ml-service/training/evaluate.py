from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.metrics import mean_absolute_error

from etl.feature_engineering import directional_symmetry
from training.routing import (
    VEHICLES,
    Route,
    calculate_profit,
    select_reroute,
)


ROUTES = {
    "DAMBULLA": Route(
        "ANURADHAPURA",
        "DAMBULLA",
        Decimal("70"),
        Decimal("1.00"),
        Decimal("2.50"),
    ),
    "PETTAH_COLOMBO": Route(
        "ANURADHAPURA",
        "PETTAH_COLOMBO",
        Decimal("205"),
        Decimal("1.00"),
        Decimal("2.50"),
    ),
    "NUWARA_ELIYA": Route(
        "ANURADHAPURA",
        "NUWARA_ELIYA",
        Decimal("185"),
        Decimal("1.25"),
        Decimal("2.50"),
    ),
    "KEPPETIPOLA": Route(
        "ANURADHAPURA",
        "KEPPETIPOLA",
        Decimal("175"),
        Decimal("1.25"),
        Decimal("2.50"),
    ),
    "MEEGODA": Route(
        "ANURADHAPURA",
        "MEEGODA",
        Decimal("195"),
        Decimal("1.00"),
        Decimal("2.50"),
    ),
    "THAMBUTTEGAMA": Route(
        "ANURADHAPURA",
        "THAMBUTTEGAMA",
        Decimal("55"),
        Decimal("1.00"),
        Decimal("2.50"),
    ),
    "JAFFNA": Route(
        "ANURADHAPURA",
        "JAFFNA",
        Decimal("260"),
        Decimal("1.00"),
        Decimal("2.50"),
    ),
}

SPOILAGE_RATES = {
    "TOMATO": Decimal("1.50"),
    "CARROT": Decimal("0.75"),
    "GREEN_CHILI": Decimal("1.20"),
    "RED_ONION": Decimal("0.50"),
}

QUANTITY_KG = Decimal("1000")
DEFAULT_MARKET = "DAMBULLA"
SAFE_MARGIN_PCT = Decimal("5.0")
SAFE_ABSOLUTE_FLOOR_LKR = Decimal("1000.00")


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


def evaluate_routing_decisions(
    frame: pd.DataFrame,
    horizon_hours: int,
    prediction_column: str,
) -> dict[str, Any]:
    """Backtest complete decisions and settle them against realized prices."""
    target_column = f"target_price_{horizon_hours}h"
    required = {
        "recorded_date",
        "market_code",
        "crop_code",
        "price_lag_1d",
        target_column,
        prediction_column,
    }
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(f"routing backtest missing columns: {sorted(missing)}")

    price_columns = [target_column]
    if prediction_column not in price_columns:
        price_columns.append(prediction_column)
    decisions = frame[
        [
            "recorded_date",
            "market_code",
            "crop_code",
            *price_columns,
        ]
    ].copy()
    decisions["recorded_date"] = pd.to_datetime(
        decisions["recorded_date"], errors="raise"
    )

    recommended_alternative_realized: list[Decimal] = []
    default_realized: list[Decimal] = []
    for (recorded_date, crop_code), snapshot in decisions.groupby(
        ["recorded_date", "crop_code"], sort=True
    ):
        if set(snapshot["market_code"]) != set(ROUTES):
            continue
        by_market = snapshot.set_index("market_code")
        predicted_net = _net_profits(
            by_market,
            crop_code,
            prediction_column,
        )
        alternative = select_reroute(
            DEFAULT_MARKET,
            predicted_net,
            SAFE_MARGIN_PCT,
            SAFE_ABSOLUTE_FLOOR_LKR,
        )
        if alternative is None:
            continue
        realized_net = _net_profits(
            by_market,
            crop_code,
            target_column,
        )
        recommended_alternative_realized.append(realized_net[alternative])
        default_realized.append(realized_net[DEFAULT_MARKET])

    return safe_margin_fpr(
        pd.Series(recommended_alternative_realized, dtype=float),
        pd.Series(default_realized, dtype=float),
    )


def _net_profits(
    snapshot: pd.DataFrame,
    crop_code: str,
    price_column: str,
) -> dict[str, Decimal]:
    vehicle = VEHICLES["MINI_TRUCK_BATTA"]
    spoilage_rate = SPOILAGE_RATES[crop_code]
    result: dict[str, Decimal] = {}
    for market_code, row in snapshot.iterrows():
        price = Decimal(str(row[price_column]))
        profit = calculate_profit(
            price,
            QUANTITY_KG,
            ROUTES[str(market_code)],
            vehicle,
            Decimal("283.00"),
            Decimal("311.00"),
            spoilage_rate,
        )
        result[str(market_code)] = profit.net_profit_lkr
    return result


def write_evaluation_report(report: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return path
