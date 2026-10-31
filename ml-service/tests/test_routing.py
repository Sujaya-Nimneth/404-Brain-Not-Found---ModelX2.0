from decimal import Decimal

import pytest

from training.routing import (
    VEHICLES,
    ProfitBreakdown,
    Route,
    calculate_profit,
    display_money,
    display_percentage,
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

    assert display_money(dambulla.effective_volume_kg) == Decimal("989.50")
    assert display_money(dambulla.gross_revenue_lkr) == Decimal("152383.00")
    assert display_money(dambulla.transport_cost_lkr) == Decimal("3169.60")
    assert display_money(dambulla.net_profit_lkr) == Decimal("146713.40")
    assert display_money(pettah.effective_volume_kg) == Decimal("969.25")
    assert display_money(pettah.gross_revenue_lkr) == Decimal("181734.38")
    assert display_money(pettah.transport_cost_lkr) == Decimal("9282.40")
    assert display_money(pettah.net_profit_lkr) == Decimal("169951.98")
    assert display_percentage(
        relative_uplift_pct(pettah.net_profit_lkr, dambulla.net_profit_lkr)
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


def test_safe_margin_uses_raw_decimal_values_not_display_rounding():
    assert not passes_safe_margin(
        Decimal("104999.996"),
        Decimal("100000.004"),
        Decimal("5"),
        Decimal("1000"),
    )


def test_shared_golden_routing_fixtures():
    import json
    from pathlib import Path

    fixture_path = Path(__file__).resolve().parent / "fixtures" / "routing_golden.json"
    golden = json.loads(fixture_path.read_text(encoding="utf-8"))
    diesel = Decimal(golden["diesel_price_lkr"])
    petrol = Decimal(golden["petrol_price_lkr"])
    safe_margin_pct = Decimal(golden["safe_margin_pct"])
    safe_floor_lkr = Decimal(golden["safe_absolute_floor_lkr"])

    for case in golden["profit_cases"]:
        breakdown = calculate_profit(
            Decimal(case["price_lkr_per_kg"]),
            Decimal(case["quantity_kg"]),
            Route(
                origin_code="ANURADHAPURA",
                market_code=case["name"],
                distance_km=Decimal(case["distance_km"]),
                terrain_factor=Decimal(case["terrain_factor"]),
                handling_fee_per_kg_lkr=Decimal(case["handling_fee_per_kg_lkr"]),
            ),
            VEHICLES[case["vehicle_type"]],
            diesel,
            petrol,
            Decimal(case["spoilage_rate_per_100km_pct"]),
        )
        expected = case["expected"]
        assert display_money(breakdown.effective_volume_kg) == Decimal(
            expected["effective_volume_kg"]
        ), case["name"]
        assert display_money(breakdown.gross_revenue_lkr) == Decimal(
            expected["gross_revenue_lkr"]
        ), case["name"]
        assert display_money(breakdown.transport_cost_lkr) == Decimal(
            expected["transport_cost_lkr"]
        ), case["name"]
        assert display_money(breakdown.handling_cost_lkr) == Decimal(
            expected["handling_cost_lkr"]
        ), case["name"]
        assert display_money(breakdown.spoilage_loss_lkr) == Decimal(
            expected["spoilage_loss_lkr"]
        ), case["name"]
        assert display_money(breakdown.net_profit_lkr) == Decimal(
            expected["net_profit_lkr"]
        ), case["name"]

    for case in golden["decision_cases"]:
        net_profits = {
            market: Decimal(value)
            for market, value in case["net_profits"].items()
        }
        selected = select_reroute(
            case["default_market_code"],
            net_profits,
            safe_margin_pct,
            safe_floor_lkr,
        )
        expected = case["expected"]
        assert selected == expected["recommended_market_code"], case["name"]
        default_net = net_profits[case["default_market_code"]]
        if selected is not None:
            winner_net = net_profits[selected]
            assert display_money(winner_net - default_net) == Decimal(
                expected["profit_delta_lkr"]
            ), case["name"]
            uplift = relative_uplift_pct(winner_net, default_net)
            if expected["profit_uplift_pct"] is None:
                assert uplift is None, case["name"]
            else:
                assert uplift is not None
                assert display_percentage(uplift) == Decimal(
                    expected["profit_uplift_pct"]
                ), case["name"]
