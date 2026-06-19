package com.stockflow.store.domain.brand.repository;

import com.stockflow.store.domain.brand.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<Brand, Long> {
}