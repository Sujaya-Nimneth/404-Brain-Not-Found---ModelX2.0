from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal


CENT = Decimal("0.01")
HUNDRED = Decimal("100")


@dataclass(frozen=True)
class Vehicle:
    capacity_kg: Decimal
    litres_per_km: Decimal
    fuel_type: Literal["DIESEL", "PETROL"]


VEHICLES = {
    "THREE_WHEELER": Vehicle(
        capacity_kg=Decimal("300"),
        litres_per_km=Decimal("0.04"),
        fuel_type="PETROL",
    ),
    "MINI_TRUCK_BATTA": Vehicle(
        capacity_kg=Decimal("1500"),
        litres_per_km=Decimal("0.08"),
        fuel_type="DIESEL",
    ),
    "LORRY_3_5T": Vehicle(
        capacity_kg=Decimal("3500"),
        litres_per_km=Decimal("0.14"),
        fuel_type="DIESEL",
    ),
}


@dataclass(frozen=True)
class Route:
    origin_code: str
    market_code: str
    distance_km: Decimal
    terrain_factor: Decimal
    handling_fee_per_kg_lkr: Decimal


@dataclass(frozen=True)
class ProfitBreakdown:
    effective_volume_kg: Decimal
    spoilage_loss_lkr: Decimal
    gross_revenue_lkr: Decimal
    transport_cost_lkr: Decimal
    handling_cost_lkr: Decimal
    net_profit_lkr: Decimal


def calculate_profit(
    price_lkr_per_kg: Decimal,
    quantity_kg: Decimal,
    route: Route,
    vehicle: Vehicle,
    diesel_price_lkr: Decimal,
    petrol_price_lkr: Decimal,
    spoilage_rate_per_100km_pct: Decimal,
) -> ProfitBreakdown:
    require_positive(price_lkr_per_kg, "price_lkr_per_kg")
    require_positive(quantity_kg, "quantity_kg")
    require_positive(route.distance_km, "distance_km")
    require_positive(route.terrain_factor, "terrain_factor")
    require_positive(diesel_price_lkr, "diesel_price_lkr")
    require_positive(petrol_price_lkr, "petrol_price_lkr")
    require_non_negative(
        route.handling_fee_per_kg_lkr, "handling_fee_per_kg_lkr"
    )
    require_non_negative(
        spoilage_rate_per_100km_pct, "spoilage_rate_per_100km_pct"
    )

    spoilage_fraction = min(
        Decimal("1"),
        route.distance_km / HUNDRED * spoilage_rate_per_100km_pct / HUNDRED,
    )
    effective_volume_kg = quantity_kg * (Decimal("1") - spoilage_fraction)
    spoilage_loss_kg = quantity_kg - effective_volume_kg
    gross_revenue_lkr = effective_volume_kg * price_lkr_per_kg
    trips = max(
        Decimal("1"),
        (quantity_kg / vehicle.capacity_kg).to_integral_value(
            rounding="ROUND_CEILING"
        ),
    )
    fuel_price = (
        diesel_price_lkr if vehicle.fuel_type == "DIESEL" else petrol_price_lkr
    )
    transport_cost_lkr = (
        Decimal("2")
        * route.distance_km
        * route.terrain_factor
        * vehicle.litres_per_km
        * fuel_price
        * trips
    )
    handling_cost_lkr = quantity_kg * route.handling_fee_per_kg_lkr
    net_profit_lkr = (
        gross_revenue_lkr - transport_cost_lkr - handling_cost_lkr
    )
    return ProfitBreakdown(
        effective_volume_kg=effective_volume_kg,
        spoilage_loss_lkr=spoilage_loss_kg * price_lkr_per_kg,
        gross_revenue_lkr=gross_revenue_lkr,
        transport_cost_lkr=transport_cost_lkr,
        handling_cost_lkr=handling_cost_lkr,
        net_profit_lkr=net_profit_lkr,
    )


def relative_uplift_pct(
    alternative_net_profit: Decimal,
    default_net_profit: Decimal,
) -> Decimal | None:
    if default_net_profit <= 0:
        return None
    return (
        (alternative_net_profit - default_net_profit)
        / default_net_profit
        * HUNDRED
    )


def passes_safe_margin(
    alternative_net_profit: Decimal,
    default_net_profit: Decimal,
    safe_margin_pct: Decimal,
    safe_absolute_floor_lkr: Decimal,
) -> bool:
    delta = alternative_net_profit - default_net_profit
    if delta < safe_absolute_floor_lkr:
        return False
    if default_net_profit <= 0:
        return alternative_net_profit > 0
    uplift = relative_uplift_pct(alternative_net_profit, default_net_profit)
    return uplift is not None and uplift >= safe_margin_pct


def select_reroute(
    default_market_code: str,
    net_profits: dict[str, Decimal],
    safe_margin_pct: Decimal,
    safe_absolute_floor_lkr: Decimal,
) -> str | None:
    if default_market_code not in net_profits:
        raise ValueError(f"default market is missing: {default_market_code}")
    default_net = net_profits[default_market_code]
    candidates = sorted(
        (
            (market_code, net_profit)
            for market_code, net_profit in net_profits.items()
            if market_code != default_market_code
        ),
        key=lambda item: (-item[1], item[0]),
    )
    for market_code, net_profit in candidates:
        if passes_safe_margin(
            net_profit,
            default_net,
            safe_margin_pct,
            safe_absolute_floor_lkr,
        ):
            return market_code
    return None


def display_money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def display_percentage(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def require_positive(value: Decimal, name: str) -> None:
    if not value.is_finite() or value <= 0:
        raise ValueError(f"{name} must be positive")


def require_non_negative(value: Decimal, name: str) -> None:
    if not value.is_finite() or value < 0:
        raise ValueError(f"{name} must be non-negative")
