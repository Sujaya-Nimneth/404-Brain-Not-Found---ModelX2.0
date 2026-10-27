package com.modelx.atie.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.Crop;

public interface CropRepository extends JpaRepository<Crop, Long> {
    Optional<Crop> findByCode(String code);

    List<Crop> findAllByOrderByNameAsc();
}
