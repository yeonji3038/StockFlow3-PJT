package com.stockflow.store.domain.store.repository;

import com.stockflow.store.domain.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}