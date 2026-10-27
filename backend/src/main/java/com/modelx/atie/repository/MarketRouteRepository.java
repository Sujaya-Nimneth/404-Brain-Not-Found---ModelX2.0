package com.modelx.atie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.MarketRoute;

public interface MarketRouteRepository extends JpaRepository<MarketRoute, Long> {
    List<MarketRoute> findByOriginCodeOrderByDistanceKmAsc(String originCode);

    Optional<MarketRoute> findByOriginCodeAndDestinationMarketCode(
            String originCode,
            String destinationMarketCode
    );
}
