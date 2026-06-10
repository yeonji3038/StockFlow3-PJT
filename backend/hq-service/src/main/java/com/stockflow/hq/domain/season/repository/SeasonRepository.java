package com.stockflow.hq.domain.season.repository;

import com.stockflow.hq.domain.season.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeasonRepository extends JpaRepository<Season, Long> {
}