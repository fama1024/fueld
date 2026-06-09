package com.fueld.workout;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkoutMetricRepository extends JpaRepository<WorkoutMetric, UUID> {}
