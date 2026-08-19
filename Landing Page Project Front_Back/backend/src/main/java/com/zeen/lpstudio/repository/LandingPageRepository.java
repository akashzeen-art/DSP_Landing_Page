package com.zeen.lpstudio.repository;

import com.zeen.lpstudio.domain.LandingPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LandingPageRepository extends JpaRepository<LandingPage, Long> {
    Optional<LandingPage> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);
}
