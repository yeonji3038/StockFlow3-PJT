package com.stockflow.hq.domain.size.repository;

import com.stockflow.hq.domain.size.entity.Size;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SizeRepository extends JpaRepository<Size, Long> {
    List<Size> findAllByOrderBySortOrderAscIdAsc();
}