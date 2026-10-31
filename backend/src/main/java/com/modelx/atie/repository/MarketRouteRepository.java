package com.modelx.atie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.MarketRoute;

public interface MarketRouteRepository extends JpaRepository<MarketRoute, Long> {
    @Override
    @EntityGraph(attributePaths = "destinationMarket")
    List<MarketRoute> findAll();

    @EntityGraph(attributePaths = "destinationMarket")
    List<MarketRoute> findByOriginCodeOrderByDistanceKmAsc(String originCode);

    @EntityGraph(attributePaths = "destinationMarket")
    Optional<MarketRoute> findByOriginCodeAndDestinationMarketCode(
            String originCode,
            String destinationMarketCode
    );
}
