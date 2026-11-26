package com.fueld.garmin.dto;

/** {@code updated}: schon vorhandene Trainings, deren Garmin-Details ergänzt oder geändert wurden. */
public record GarminSyncResponse(int imported, int updated, int skipped) {}
