package com.fueld.garmin;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Ausschnitt einer Aktivität aus der Garmin Personal API
 * (GET /activitylist-service/activities/search/activities).
 * Einheiten laut Garmin: duration in Sekunden, distance in Metern,
 * startTimeGMT als "yyyy-MM-dd HH:mm:ss" in UTC. Alles andere wird ignoriert.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GarminActivity(
        Long activityId,
        String activityName,
        String startTimeGMT,
        Double duration,
        Double distance,
        Double averageHR,
        Double maxHR,
        Double calories,
        ActivityType activityType
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ActivityType(String typeKey) {}

    public String typeKey() {
        return activityType != null ? activityType.typeKey() : null;
    }
}
