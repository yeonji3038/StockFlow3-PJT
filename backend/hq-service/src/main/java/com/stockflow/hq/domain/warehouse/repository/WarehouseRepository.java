package com.stockflow.hq.domain.warehouse.repository;

import com.stockflow.hq.domain.warehouse.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
}
