package com.modelx.atie.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.HistoricalPrice;

public interface HistoricalPriceRepository extends JpaRepository<HistoricalPrice, Long> {
    Optional<HistoricalPrice> findTopByMarketCodeAndCropCodeOrderByRecordedDateDesc(
            String marketCode,
            String cropCode
    );

    List<HistoricalPrice> findByMarketCodeAndCropCodeAndRecordedDateGreaterThanEqualOrderByRecordedDateAsc(
            String marketCode,
            String cropCode,
            LocalDate startDate
    );

    List<HistoricalPrice> findByMarketCodeAndCropCodeOrderByRecordedDateDesc(
            String marketCode,
            String cropCode,
            Pageable pageable
    );
}
