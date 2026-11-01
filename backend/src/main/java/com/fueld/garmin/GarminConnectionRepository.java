package com.fueld.garmin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GarminConnectionRepository extends JpaRepository<GarminConnection, UUID> {
    Optional<GarminConnection> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
    void deleteByUserId(UUID userId);

    // Der Scheduler läuft ohne offene Session, der Nutzer muss deshalb direkt mitgeladen werden
    @Query("select c from GarminConnection c join fetch c.user")
    List<GarminConnection> findAllWithUser();
}
