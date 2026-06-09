package com.fueld.pantry;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PantryItemRepository extends JpaRepository<PantryItem, UUID> {
    List<PantryItem> findByUserIdOrderByAddedAtDesc(UUID userId);
}
