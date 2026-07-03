package com.stockflow.hq.domain.product.repository;

import com.stockflow.hq.domain.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    long countByBrandIdAndSeasonIdAndCategoryId(Long brandId, Long seasonId, Long categoryId);
}