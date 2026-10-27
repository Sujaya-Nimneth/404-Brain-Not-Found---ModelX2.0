package com.modelx.atie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.Market;

public interface MarketRepository extends JpaRepository<Market, Long> {
    Optional<Market> findByCode(String code);

    List<Market> findAllByOrderByNameAsc();
}
