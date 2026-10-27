from decimal import Decimal

import pytest

from training.routing import (
    VEHICLES,
    ProfitBreakdown,
    Route,
    calculate_profit,
    passes_safe_margin,
    relative_uplift_pct,
    select_reroute,
)


def route(market_code: str, distance_km: str) -> Route:
    return Route(
        origin_code="ANURADHAPURA",
        market_code=market_code,
        distance_km=Decimal(distance_km),
        terrain_factor=Decimal("1.00"),
        handling_fee_per_kg_lkr=Decimal("2.50"),
    )


def profit(market_code: str, distance_km: str, price: str) -> ProfitBreakdown:
    return calculate_profit(
        Decimal(price),
        Decimal("1000"),
        route(market_code, distance_km),
        VEHICLES["MINI_TRUCK_BATTA"],
        Decimal("283.00"),
        Decimal("311.00"),
        Decimal("1.50"),
    )


def test_canonical_dambulla_and_pettah_match_backend_contract():
    dambulla = profit("DAMBULLA", "70", "154.00")
    pettah = profit("PETTAH_COLOMBO", "205", "187.50")

    assert dambulla.effective_volume_kg == Decimal("989.50")
    assert dambulla.gross_revenue_lkr == Decimal("152383.00")
    assert dambulla.transport_cost_lkr == Decimal("3169.60")
    assert dambulla.net_profit_lkr == Decimal("146713.40")
    assert pettah.effective_volume_kg == Decimal("969.25")
    assert pettah.gross_revenue_lkr == Decimal("181734.38")
    assert pettah.transport_cost_lkr == Decimal("9282.40")
    assert pettah.net_profit_lkr == Decimal("169951.98")
    assert relative_uplift_pct(
        pettah.net_profit_lkr, dambulla.net_profit_lkr
    ) == Decimal("15.84")


def test_terrain_raises_fuel_cost_but_not_spoilage():
    flat = profit("KEPPETIPOLA", "175", "165.00")
    hilly = calculate_profit(
        Decimal("165.00"),
        Decimal("1000"),
        Route(
            "ANURADHAPURA",
            "KEPPETIPOLA",
            Decimal("175"),
            Decimal("1.25"),
            Decimal("2.50"),
        ),
        VEHICLES["MINI_TRUCK_BATTA"],
        Decimal("283.00"),
        Decimal("311.00"),
        Decimal("1.50"),
    )

    assert hilly.effective_volume_kg == flat.effective_volume_kg
    assert hilly.transport_cost_lkr > flat.transport_cost_lkr


def test_relative_uplift_is_null_for_non_positive_default():
    assert relative_uplift_pct(Decimal("100"), Decimal("0")) is None
    assert relative_uplift_pct(Decimal("100"), Decimal("-1")) is None


def test_safe_margin_requires_percentage_and_absolute_floor():
    assert not passes_safe_margin(
        Decimal("104.99"), Decimal("100"), Decimal("5"), Decimal("1")
    )
    assert not passes_safe_margin(
        Decimal("106"), Decimal("100"), Decimal("5"), Decimal("10")
    )
    assert passes_safe_margin(
        Decimal("106"), Decimal("100"), Decimal("5"), Decimal("1")
    )


def test_non_positive_default_reroutes_only_to_positive_profit():
    assert passes_safe_margin(
        Decimal("5000"), Decimal("-1000"), Decimal("5"), Decimal("1000")
    )
    assert not passes_safe_margin(
        Decimal("-500"), Decimal("-1000"), Decimal("5"), Decimal("1000")
    )


def test_select_reroute_chooses_highest_eligible_net_profit():
    selected = select_reroute(
        "DAMBULLA",
        {
            "DAMBULLA": Decimal("100"),
            "PETTAH_COLOMBO": Decimal("130"),
            "MEEGODA": Decimal("120"),
        },
        Decimal("5"),
        Decimal("1"),
    )

    assert selected == "PETTAH_COLOMBO"


def test_zero_current_price_is_rejected():
    with pytest.raises(ValueError, match="positive"):
        profit("DAMBULLA", "70", "0")
