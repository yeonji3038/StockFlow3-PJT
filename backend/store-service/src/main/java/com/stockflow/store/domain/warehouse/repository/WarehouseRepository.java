package com.stockflow.store.domain.warehouse.repository;

import com.stockflow.store.domain.warehouse.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
}
