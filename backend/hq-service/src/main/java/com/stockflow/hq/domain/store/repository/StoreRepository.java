package com.stockflow.hq.domain.store.repository;

import com.stockflow.hq.domain.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}