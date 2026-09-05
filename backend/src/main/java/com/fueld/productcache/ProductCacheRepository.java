package com.fueld.productcache;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductCacheRepository extends JpaRepository<ProductCacheEntry, UUID> {
    Optional<ProductCacheEntry> findByUserIdAndNameIgnoreCase(UUID userId, String name);

    List<ProductCacheEntry> findTop50ByUserIdOrderByLastUsedAtDesc(UUID userId);
}
