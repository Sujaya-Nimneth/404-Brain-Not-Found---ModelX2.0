package com.modelx.atie.repository;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.MarketRoute;

public interface MarketRouteRepository extends JpaRepository<MarketRoute, Long> {
    @Override
    @EntityGraph(attributePaths = "destinationMarket")
    List<MarketRoute> findAll();

    @Override
    @EntityGraph(attributePaths = "destinationMarket")
    List<MarketRoute> findAll(Sort sort);

    @EntityGraph(attributePaths = "destinationMarket")
    List<MarketRoute> findByOriginCodeOrderByDistanceKmAsc(String originCode);
}
