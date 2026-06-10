package com.stockflow.store.domain.season.repository;

import com.stockflow.store.domain.season.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeasonRepository extends JpaRepository<Season, Long> {
}