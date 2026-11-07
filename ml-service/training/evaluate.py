from __future__ import annotations

import json
from collections.abc import Sequence
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.metrics import mean_absolute_error

from etl.feature_engineering import directional_symmetry
from etl.seed_loader import fuel_prices_for_date, round_half_up_2
from training.routing import (
    VEHICLES,
    Route,
    calculate_profit,
    select_reroute,
)


ROUTES = {
    "ANURADHAPURA": {
        "DAMBULLA": Route(
            "ANURADHAPURA", "DAMBULLA", Decimal("70"), Decimal("1.00"), Decimal("2.50")
        ),
        "PETTAH_COLOMBO": Route(
            "ANURADHAPURA", "PETTAH_COLOMBO", Decimal("205"), Decimal("1.00"), Decimal("2.50")
        ),
        "NUWARA_ELIYA": Route(
            "ANURADHAPURA", "NUWARA_ELIYA", Decimal("185"), Decimal("1.25"), Decimal("2.50")
        ),
        "KEPPETIPOLA": Route(
            "ANURADHAPURA", "KEPPETIPOLA", Decimal("175"), Decimal("1.25"), Decimal("2.50")
        ),
        "MEEGODA": Route(
            "ANURADHAPURA", "MEEGODA", Decimal("195"), Decimal("1.00"), Decimal("2.50")
        ),
        "THAMBUTTEGAMA": Route(
            "ANURADHAPURA", "THAMBUTTEGAMA", Decimal("55"), Decimal("1.00"), Decimal("2.50")
        ),
        "JAFFNA": Route(
            "ANURADHAPURA", "JAFFNA", Decimal("260"), Decimal("1.00"), Decimal("2.50")
        ),
    },
    "JAFFNA": {
        "DAMBULLA": Route(
            "JAFFNA", "DAMBULLA", Decimal("330"), Decimal("1.00"), Decimal("2.50")
        ),
        "PETTAH_COLOMBO": Route(
            "JAFFNA", "PETTAH_COLOMBO", Decimal("400"), Decimal("1.00"), Decimal("2.50")
        ),
        "NUWARA_ELIYA": Route(
            "JAFFNA", "NUWARA_ELIYA", Decimal("445"), Decimal("1.25"), Decimal("2.50")
        ),
        "KEPPETIPOLA": Route(
            "JAFFNA", "KEPPETIPOLA", Decimal("435"), Decimal("1.25"), Decimal("2.50")
        ),
        "MEEGODA": Route(
            "JAFFNA", "MEEGODA", Decimal("390"), Decimal("1.00"), Decimal("2.50")
        ),
        "THAMBUTTEGAMA": Route(
            "JAFFNA", "THAMBUTTEGAMA", Decimal("275"), Decimal("1.00"), Decimal("2.50")
        ),
        "JAFFNA": Route(
            "JAFFNA", "JAFFNA", Decimal("5"), Decimal("1.00"), Decimal("2.50")
        ),
    },
    "DAMBULLA": {
        "DAMBULLA": Route(
            "DAMBULLA", "DAMBULLA", Decimal("3"), Decimal("1.00"), Decimal("2.50")
        ),
        "PETTAH_COLOMBO": Route(
            "DAMBULLA", "PETTAH_COLOMBO", Decimal("150"), Decimal("1.00"), Decimal("2.50")
        ),
        "NUWARA_ELIYA": Route(
            "DAMBULLA", "NUWARA_ELIYA", Decimal("120"), Decimal("1.25"), Decimal("2.50")
        ),
        "KEPPETIPOLA": Route(
            "DAMBULLA", "KEPPETIPOLA", Decimal("125"), Decimal("1.25"), Decimal("2.50")
        ),
        "MEEGODA": Route(
            "DAMBULLA", "MEEGODA", Decimal("140"), Decimal("1.00"), Decimal("2.50")
        ),
        "THAMBUTTEGAMA": Route(
            "DAMBULLA", "THAMBUTTEGAMA", Decimal("75"), Decimal("1.00"), Decimal("2.50")
        ),
        "JAFFNA": Route(
            "DAMBULLA", "JAFFNA", Decimal("330"), Decimal("1.00"), Decimal("2.50")
        ),
    },
    "NUWARA_ELIYA": {
        "DAMBULLA": Route(
            "NUWARA_ELIYA", "DAMBULLA", Decimal("120"), Decimal("1.25"), Decimal("2.50")
        ),
        "PETTAH_COLOMBO": Route(
            "NUWARA_ELIYA", "PETTAH_COLOMBO", Decimal("180"), Decimal("1.25"), Decimal("2.50")
        ),
        "NUWARA_ELIYA": Route(
            "NUWARA_ELIYA", "NUWARA_ELIYA", Decimal("3"), Decimal("1.25"), Decimal("2.50")
        ),
        "KEPPETIPOLA": Route(
            "NUWARA_ELIYA", "KEPPETIPOLA", Decimal("55"), Decimal("1.25"), Decimal("2.50")
        ),
        "MEEGODA": Route(
            "NUWARA_ELIYA", "MEEGODA", Decimal("170"), Decimal("1.25"), Decimal("2.50")
        ),
        "THAMBUTTEGAMA": Route(
            "NUWARA_ELIYA", "THAMBUTTEGAMA", Decimal("185"), Decimal("1.25"), Decimal("2.50")
        ),
        "JAFFNA": Route(
            "NUWARA_ELIYA", "JAFFNA", Decimal("445"), Decimal("1.25"), Decimal("2.50")
        ),
    },
    "THAMBUTTEGAMA": {
        "DAMBULLA": Route(
            "THAMBUTTEGAMA", "DAMBULLA", Decimal("75"), Decimal("1.00"), Decimal("2.50")
        ),
        "PETTAH_COLOMBO": Route(
            "THAMBUTTEGAMA", "PETTAH_COLOMBO", Decimal("190"), Decimal("1.00"), Decimal("2.50")
        ),
        "NUWARA_ELIYA": Route(
            "THAMBUTTEGAMA", "NUWARA_ELIYA", Decimal("185"), Decimal("1.25"), Decimal("2.50")
        ),
        "KEPPETIPOLA": Route(
            "THAMBUTTEGAMA", "KEPPETIPOLA", Decimal("180"), Decimal("1.25"), Decimal("2.50")
        ),
        "MEEGODA": Route(
            "THAMBUTTEGAMA", "MEEGODA", Decimal("175"), Decimal("1.00"), Decimal("2.50")
        ),
        "THAMBUTTEGAMA": Route(
            "THAMBUTTEGAMA", "THAMBUTTEGAMA", Decimal("3"), Decimal("1.00"), Decimal("2.50")
        ),
        "JAFFNA": Route(
            "THAMBUTTEGAMA", "JAFFNA", Decimal("275"), Decimal("1.00"), Decimal("2.50")
        ),
    },
}

SPOILAGE_RATES = {
    "TOMATO": Decimal("1.50"),
    "CARROT": Decimal("0.75"),
    "GREEN_CHILI": Decimal("1.20"),
    "RED_ONION": Decimal("0.50"),
}

QUANTITY_KG = Decimal("1000")
DEFAULT_ORIGIN = "ANURADHAPURA"
DEFAULT_MARKET = "DAMBULLA"
SAFE_MARGIN_PCT = Decimal("5.0")
SAFE_ABSOLUTE_FLOOR_LKR = Decimal("1000.00")
EVALUATION_ORIGINS = (
    "ANURADHAPURA",
    "JAFFNA",
    "DAMBULLA",
    "NUWARA_ELIYA",
    "THAMBUTTEGAMA",
)
EVALUATION_VEHICLES = ("THREE_WHEELER", "MINI_TRUCK_BATTA", "LORRY_3_5T")
EVALUATION_QUANTITIES = (
    Decimal("300"),
    Decimal("1000"),
    Decimal("1500"),
    Decimal("3500"),
)


def evaluate_predictions(
    frame: pd.DataFrame,
    target_column: str,
    prediction_column: str,
) -> dict[str, float]:
    current_column = (
        "wholesale_price_lkr_per_kg"
        if "wholesale_price_lkr_per_kg" in frame.columns
        else "price_lag_1d"
    )
    current = frame[current_column]
    actual = frame[target_column]
    predicted = frame[prediction_column]
    return {
        "directional_symmetry_pct": round_half_up_2(
            directional_symmetry(current, actual, predicted)
        ),
        "mae_lkr": round_half_up_2(float(mean_absolute_error(actual, predicted))),
    }


def _to_decimal(value: Decimal | float | int | str) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(str(value))


def safe_margin_fpr(
    recommended_alternative_realized_net: Sequence[Decimal | float | int | str]
    | pd.Series,
    default_realized_net: Sequence[Decimal | float | int | str] | pd.Series,
) -> dict[str, Any]:
    alternatives = [
        _to_decimal(item) for item in recommended_alternative_realized_net
    ]
    defaults = [_to_decimal(item) for item in default_realized_net]
    if len(alternatives) != len(defaults):
        raise ValueError(
            "recommended alternative and default realized net series must align"
        )
    reroute_count = len(alternatives)
    if reroute_count == 0:
        return {
            "safe_margin_fpr_pct": None,
            "reroute_count": 0,
            "false_reroute_count": 0,
        }
    false_count = sum(
        1
        for alternative_net, default_net in zip(
            alternatives, defaults, strict=True
        )
        if alternative_net < default_net
    )
    pct = (
        Decimal(false_count)
        * Decimal("100")
        / Decimal(reroute_count)
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "safe_margin_fpr_pct": float(pct),
        "reroute_count": reroute_count,
        "false_reroute_count": false_count,
    }


def evaluate_routing_decisions(
    frame: pd.DataFrame,
    horizon_hours: int,
    prediction_column: str,
    origin_code: str = DEFAULT_ORIGIN,
    quantity_kg: Decimal = QUANTITY_KG,
    vehicle_code: str = "MINI_TRUCK_BATTA",
    market_codes: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    """Backtest complete decisions and settle them against realized prices."""
    target_column = f"target_price_{horizon_hours}h"
    required = {
        "recorded_date",
        "market_code",
        "crop_code",
        target_column,
        prediction_column,
    }
    missing = required.difference(frame.columns)
    if (
        "wholesale_price_lkr_per_kg" not in frame.columns
        and "price_lag_1d" not in frame.columns
    ):
        missing.add("wholesale_price_lkr_per_kg")
    if missing:
        raise ValueError(f"routing backtest missing columns: {sorted(missing)}")

    price_columns = [target_column]
    if prediction_column not in price_columns:
        price_columns.append(prediction_column)
    extra_columns = (
        ["diesel_price_lkr"] if "diesel_price_lkr" in frame.columns else []
    )
    decisions = frame[
        [
            "recorded_date",
            "market_code",
            "crop_code",
            *price_columns,
            *extra_columns,
        ]
    ].copy()
    decisions["recorded_date"] = pd.to_datetime(
        decisions["recorded_date"], errors="raise"
    )
    if market_codes is not None:
        decisions = decisions[decisions["market_code"].isin(market_codes)].copy()

    recommended_alternative_realized: list[Decimal] = []
    default_realized: list[Decimal] = []
    route_set = ROUTES[origin_code]
    if DEFAULT_MARKET not in route_set:
        raise ValueError(f"default market is unreachable from {origin_code}")
    for (recorded_date, crop_code), snapshot in decisions.groupby(
        ["recorded_date", "crop_code"], sort=True
    ):
        if DEFAULT_MARKET not in set(snapshot["market_code"]):
            continue
        if not set(snapshot["market_code"]).issubset(route_set):
            continue
        by_market = snapshot.set_index("market_code")
        diesel_price, petrol_price = _resolve_fuel_prices(
            recorded_date, by_market
        )
        predicted_net = _net_profits(
            by_market,
            crop_code,
            prediction_column,
            route_set,
            quantity_kg,
            vehicle_code,
            diesel_price,
            petrol_price,
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
            route_set,
            quantity_kg,
            vehicle_code,
            diesel_price,
            petrol_price,
        )
        recommended_alternative_realized.append(realized_net[alternative])
        default_realized.append(realized_net[DEFAULT_MARKET])

    return safe_margin_fpr(
        recommended_alternative_realized,
        default_realized,
    )


def _resolve_fuel_prices(
    recorded_date: pd.Timestamp,
    snapshot: pd.DataFrame,
) -> tuple[Decimal, Decimal]:
    scheduled_diesel, scheduled_petrol = fuel_prices_for_date(recorded_date)
    if "diesel_price_lkr" in snapshot.columns:
        raw_diesel = snapshot["diesel_price_lkr"].iloc[0]
        if pd.notna(raw_diesel):
            diesel = Decimal(str(raw_diesel)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            petrol = diesel + (scheduled_petrol - scheduled_diesel)
            return diesel, petrol
    return scheduled_diesel, scheduled_petrol


def _net_profits(
    snapshot: pd.DataFrame,
    crop_code: str,
    price_column: str,
    route_set: dict[str, Route],
    quantity_kg: Decimal,
    vehicle_code: str,
    diesel_price_lkr: Decimal = Decimal("283.00"),
    petrol_price_lkr: Decimal = Decimal("311.00"),
) -> dict[str, Decimal]:
    vehicle = VEHICLES[vehicle_code]
    spoilage_rate = SPOILAGE_RATES[crop_code]
    result: dict[str, Decimal] = {}
    for market_code, row in snapshot.iterrows():
        price = Decimal(str(row[price_column]))
        profit = calculate_profit(
            price,
            quantity_kg,
            route_set[str(market_code)],
            vehicle,
            diesel_price_lkr,
            petrol_price_lkr,
            spoilage_rate,
        )
        result[str(market_code)] = profit.net_profit_lkr
    return result


def evaluate_routing_matrix(
    frame: pd.DataFrame,
    horizon_hours: int,
    prediction_column: str,
) -> dict[str, Any]:
    """Evaluate the finite operational scenario matrix from CONTRACTS.md."""
    results: list[dict[str, Any]] = []
    total_reroutes = 0
    total_false_reroutes = 0
    for origin_code in EVALUATION_ORIGINS:
        alternatives = sorted(
            (
                (market_code, route.distance_km)
                for market_code, route in ROUTES[origin_code].items()
                if market_code != DEFAULT_MARKET
            ),
            key=lambda item: (item[1], item[0]),
        )[:2]
        compared_markets = (DEFAULT_MARKET, *(code for code, _ in alternatives))
        for vehicle_code in EVALUATION_VEHICLES:
            for quantity_kg in EVALUATION_QUANTITIES:
                result = evaluate_routing_decisions(
                    frame,
                    horizon_hours,
                    prediction_column,
                    origin_code,
                    quantity_kg,
                    vehicle_code,
                    compared_markets,
                )
                total_reroutes += result["reroute_count"]
                total_false_reroutes += result["false_reroute_count"]
                results.append(
                    {
                        "origin": origin_code,
                        "vehicle": vehicle_code,
                        "quantity_kg": str(quantity_kg),
                        **result,
                    }
                )
    agg_fpr = (
        None
        if total_reroutes == 0
        else float(
            (
                Decimal(total_false_reroutes)
                * Decimal("100")
                / Decimal(total_reroutes)
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
    )
    return {
        "safe_margin_fpr_pct": agg_fpr,
        "reroute_count": total_reroutes,
        "false_reroute_count": total_false_reroutes,
        "scenario_count": len(results),
        "scenarios": results,
    }


def write_evaluation_report(report: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return path
