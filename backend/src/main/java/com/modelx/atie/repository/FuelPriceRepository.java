package com.modelx.atie.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.FuelPrice;

public interface FuelPriceRepository extends JpaRepository<FuelPrice, Long> {
    Optional<FuelPrice> findTopByOrderByEffectiveDateDesc();
}
