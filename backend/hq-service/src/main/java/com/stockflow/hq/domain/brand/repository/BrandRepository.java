package com.stockflow.hq.domain.brand.repository;

import com.stockflow.hq.domain.brand.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<Brand, Long> {
}