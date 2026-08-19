package com.zeen.lpstudio.repository;

import com.zeen.lpstudio.domain.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OperatorRepository extends JpaRepository<Operator, Long> {
    List<Operator> findByLandingPageIdOrderBySortOrderAsc(Long landingPageId);
    void deleteByLandingPageId(Long landingPageId);
}
