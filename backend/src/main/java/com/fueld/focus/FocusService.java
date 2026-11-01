package com.fueld.focus;

import com.fueld.ai.AiService;
import com.fueld.ai.LogContextFormatter;
import com.fueld.focus.dto.FocusAnalysis;
import com.fueld.focus.dto.FocusResponse;
import com.fueld.insight.AiInsight;
import com.fueld.insight.AiInsightRepository;
import com.fueld.meal.MealLog;
import com.fueld.meal.MealLogRepository;
import com.fueld.meal.MealService;
import com.fueld.meal.dto.DayTotalResponse;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import com.fueld.workout.WorkoutService;
import com.fueld.workout.dto.WorkoutLogResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Fokus für die nächsten Tage. Die Prozentwerte rechnet das Backend selbst, die KI wählt
 * daraus das Wichtigste für das Ziel und formuliert es. Das Ergebnis liegt pro Tag in
 * {@code ai_insight}, damit nicht jedes Öffnen der App einen KI-Call auslöst. Bei einem
 * Fehler bleibt {@code items} leer und das Frontend zeigt seine einfachen Hinweise.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FocusService {

    static final String TYPE = "focus";
    /** Erhöhen, wenn sich der Prompt ändert: Der gespeicherte Tages-Fokus wird dann neu erstellt. */
    static final int PROMPT_VERSION = 3;
    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");
    private static final int TREND_DAYS = 7;
    private static final int MAX_STEPS = 3;
    private static final int MAX_RECENT_MEALS = 20;

    private final AiService aiService;
    private final AiInsightRepository insightRepository;
    private final MealService mealService;
    private final MealLogRepository mealLogRepository;
    private final WorkoutService workoutService;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final LogContextFormatter logContextFormatter;
    private final ObjectMapper objectMapper;

    public FocusResponse getFocus(User user) {
        Optional<Profile> profile = profileRepository.findByUserId(user.getId());
        String goal = profile.map(this::describeGoal).orElse(null);
        String diet = profile.map(Profile::getDiet).filter(d -> !d.isBlank()).orElse(null);
        LocalDate today = LocalDate.now(ZONE);

        Optional<AiInsight> stored = insightRepository.findByUserIdAndTypeAndPeriodStart(user.getId(), TYPE, today);
        if (stored.isPresent() && !isOutdated(stored.get(), profile)) {
            FocusAnalysis focus = read(stored.get());
            if (focus != null) return new FocusResponse(goal, diet, focus.summary(), focus.steps());
        }

        List<DayTotalResponse> days = mealService.getTrend(user, TREND_DAYS).stream()
                .filter(day -> !day.date().equals(today))
                .filter(FocusService::isLogged)
                .toList();
        if (days.isEmpty()) return new FocusResponse(goal, diet, null, List.of());

        try {
            GoalsResponse goals = profileService.getGoals(user);
            String profileContext = profile.map(logContextFormatter::formatProfile).orElse("Kein Profil vorhanden.");
            FocusAnalysis focus = sanitize(aiService.generateFocus(
                    profileContext, formatFacts(user, days, goals, today), formatRecentMeals(user, today)));
            if (focus == null) {
                log.warn("KI-Fokus enthielt keine Kernaussage");
                return new FocusResponse(goal, diet, null, List.of());
            }
            store(user, stored, today, focus);
            return new FocusResponse(goal, diet, focus.summary(), focus.steps());
        } catch (RuntimeException e) {
            log.error("KI-Fokus konnte nicht erstellt werden", e);
            return new FocusResponse(goal, diet, null, List.of());
        }
    }

    /** Wer Ziel oder Ernährung ändert, soll das noch am selben Tag im Fokus sehen. */
    private static boolean isOutdated(AiInsight stored, Optional<Profile> profile) {
        return profile.map(Profile::getUpdatedAt)
                .filter(updated -> updated.isAfter(stored.getCreatedAt()))
                .isPresent();
    }

    private String describeGoal(Profile profile) {
        List<String> tags = profileService.deserializeGoalTags(profile.getGoalTags());
        if (!tags.isEmpty()) return String.join(", ", tags);
        return profile.getGoals() != null && !profile.getGoals().isBlank() ? profile.getGoals() : null;
    }

    private static boolean isLogged(DayTotalResponse day) {
        return day.calories() > 0 || day.protein() > 0 || day.carbs() > 0 || day.fat() > 0;
    }

    /** Liefert null, wenn der Eintrag unlesbar ist oder von einem älteren Prompt stammt. */
    private FocusAnalysis read(AiInsight stored) {
        try {
            FocusAnalysis focus = objectMapper.readValue(stored.getContent(), FocusAnalysis.class);
            return Integer.valueOf(PROMPT_VERSION).equals(focus.version()) ? sanitize(focus) : null;
        } catch (RuntimeException e) {
            log.warn("Gespeicherter Fokus nicht lesbar, wird neu erstellt", e);
            return null;
        }
    }

    /** Die KI-Antwort ist eine Eingabe: Ohne Kernaussage gilt sie als leer, die Schritte bleiben begrenzt. */
    static FocusAnalysis sanitize(FocusAnalysis focus) {
        if (focus == null || focus.summary() == null || focus.summary().isBlank()) return null;
        List<String> steps = focus.steps() == null ? List.of() : focus.steps().stream()
                .filter(step -> step != null && !step.isBlank())
                .map(String::trim)
                .limit(MAX_STEPS)
                .toList();
        return new FocusAnalysis(focus.summary().trim(), steps, focus.version());
    }

    private void store(User user, Optional<AiInsight> stored, LocalDate today, FocusAnalysis focus) {
        try {
            AiInsight insight = stored.orElseGet(() -> AiInsight.builder()
                    .user(user).type(TYPE).periodStart(today).periodEnd(today).build());
            insight.setContent(objectMapper.writeValueAsString(
                    new FocusAnalysis(focus.summary(), focus.steps(), PROMPT_VERSION)));
            insight.setCreatedAt(Instant.now());
            insightRepository.save(insight);
        } catch (RuntimeException e) {
            // Zwei gleichzeitige Aufrufe können am Unique-Index scheitern. Der Fokus ist trotzdem gültig.
            log.warn("Fokus konnte nicht gespeichert werden", e);
        }
    }

    private String formatFacts(User user, List<DayTotalResponse> days, GoalsResponse goals, LocalDate today) {
        Map<LocalDate, List<WorkoutLogResponse>> workouts = workoutService
                .getHistorySince(user, today.minusDays(TREND_DAYS - 1L)).stream()
                .collect(Collectors.groupingBy(w -> w.performedAt().atZone(ZONE).toLocalDate()));

        List<String> lines = new ArrayList<>();
        lines.add("Tagesziele: %d kcal, %d g Protein, %d g Kohlenhydrate, %d g Fett"
                .formatted(goals.calories(), goals.protein(), goals.carbs(), goals.fat()));
        lines.add("Durchschnitt aus %d Tagen mit Einträgen, ohne heute, in Prozent vom Ziel: %s".formatted(
                days.size(),
                formatPercents(average(days, DayTotalResponse::calories), average(days, DayTotalResponse::protein),
                        average(days, DayTotalResponse::carbs), average(days, DayTotalResponse::fat), goals)));
        lines.add("Einzelne Tage:");
        for (DayTotalResponse day : days) {
            String training = workouts.getOrDefault(day.date(), List.of()).stream()
                    .map(w -> w.type() + (w.durationMinutes() != null ? " " + w.durationMinutes() + " min" : ""))
                    .collect(Collectors.joining(", "));
            lines.add("- %s: %s, Training: %s".formatted(
                    day.date(),
                    formatPercents(day.calories(), day.protein(), day.carbs(), day.fat(), goals),
                    training.isEmpty() ? "keins" : training));
        }
        return String.join("\n", lines);
    }

    private static double average(List<DayTotalResponse> days, java.util.function.ToIntFunction<DayTotalResponse> macro) {
        return days.stream().mapToInt(macro).average().orElse(0);
    }

    private static String formatPercents(double calories, double protein, double carbs, double fat, GoalsResponse goals) {
        return "Kalorien %s, Protein %s, Kohlenhydrate %s, Fett %s".formatted(
                percent(calories, goals.calories()), percent(protein, goals.protein()),
                percent(carbs, goals.carbs()), percent(fat, goals.fat()));
    }

    private static String percent(double value, int goal) {
        return goal > 0 ? Math.round(value / goal * 100) + " %" : "unbekannt";
    }

    private String formatRecentMeals(User user, LocalDate today) {
        Instant from = today.minusDays(TREND_DAYS - 1L).atStartOfDay(ZONE).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(ZONE).toInstant();
        List<String> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to).stream()
                .limit(MAX_RECENT_MEALS)
                .map(FocusService::describeMeal)
                .toList();
        return meals.isEmpty() ? "Keine." : "- " + String.join("\n- ", meals);
    }

    private static String describeMeal(MealLog meal) {
        return meal.getSummary() != null && !meal.getSummary().isBlank() ? meal.getSummary() : meal.getTextInput();
    }
}
