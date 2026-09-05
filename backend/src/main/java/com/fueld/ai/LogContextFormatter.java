package com.fueld.ai;

import com.fueld.meal.MealLog;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileService;
import com.fueld.workout.WorkoutLog;
import com.fueld.workout.WorkoutMetric;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Baut die Text-Bausteine für KI-Prompts, die mehrere Features gemeinsam brauchen:
 * eine kompakte Profil-Beschreibung und eine Auflistung der Log-Einträge eines
 * Zeitraums. Wird vom Wochen-/Tagesrückblick ({@code InsightService}) und vom
 * Dashboard-Assistenten ({@code AssistantService}) genutzt, damit beide dasselbe
 * Format sehen und es nur an einer Stelle gepflegt wird.
 */
@Component
@RequiredArgsConstructor
public class LogContextFormatter {

    private final ProfileService profileService;

    /** Kurze Profil-Beschreibung (Ziele, Ernährung, Sport) für den Prompt-Kontext. */
    public String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        List<String> tags = profileService.deserializeGoalTags(p.getGoalTags());
        if (!tags.isEmpty()) sb.append("Ziele (ausgewählt): ").append(String.join(", ", tags)).append("\n");
        if (p.getGoals() != null) sb.append("Ziele (Freitext): ").append(p.getGoals()).append("\n");
        if (p.getDiet()  != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports()!= null) sb.append("Sport (allgemein betriebene Sportarten laut Profil, KEINE Aussage darüber, was im aktuellen Zeitraum tatsächlich gemacht wurde): ").append(p.getSports()).append("\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    /** Auflistung aller Mahlzeiten und Trainings eines Zeitraums mit den wichtigsten Werten. */
    public String buildLogSummary(List<MealLog> meals, List<WorkoutLog> workouts, ZoneId zone) {
        if (meals.isEmpty() && workouts.isEmpty()) return "Keine Einträge in diesem Zeitraum.";

        StringBuilder sb = new StringBuilder();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM. HH:mm");

        if (!meals.isEmpty()) {
            sb.append("MAHLZEITEN (").append(meals.size()).append("):\n");
            for (MealLog m : meals) {
                sb.append("- ").append(m.getEatenAt().atZone(zone).format(fmt))
                        .append(": ").append(m.getTextInput());
                if (m.getCalories() != null) sb.append(" | ").append(m.getCalories()).append(" kcal");
                if (m.getProtein()  != null) sb.append(", ").append(m.getProtein()).append("g P");
                if (m.getCarbs()    != null) sb.append(", ").append(m.getCarbs()).append("g K");
                if (m.getFat()      != null) sb.append(", ").append(m.getFat()).append("g F");
                sb.append("\n");
            }
        }

        if (!workouts.isEmpty()) {
            sb.append("\nTRAININGS (").append(workouts.size()).append("):\n");
            for (WorkoutLog w : workouts) {
                sb.append("- ").append(w.getPerformedAt().atZone(zone).format(fmt))
                        .append(": ").append(w.getType());
                if (w.getDurationMinutes() != null) sb.append(", ").append(w.getDurationMinutes()).append(" min");
                WorkoutMetric metric = w.getMetric();
                if (metric != null) {
                    if (metric.getDistanceKm() != null) sb.append(", ").append(metric.getDistanceKm()).append(" km");
                    if (metric.getPacePerKm() != null) sb.append(", ").append(metric.getPacePerKm()).append(" min/km");
                    if (metric.getAvgHeartRate() != null) sb.append(", ⌀ ").append(metric.getAvgHeartRate()).append(" bpm");
                    if (metric.getCaloriesBurned() != null) sb.append(", ").append(metric.getCaloriesBurned()).append(" kcal");
                }
                if (w.getSummary() != null) sb.append(" | ").append(w.getSummary());
                if (w.getNotes() != null && !w.getNotes().isBlank()) sb.append(" | Notiz: ").append(w.getNotes());
                sb.append("\n");
            }
        }
        return sb.toString();
    }
}
