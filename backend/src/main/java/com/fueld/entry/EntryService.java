package com.fueld.entry;

import com.fueld.ai.AiService;
import com.fueld.ai.LogContextFormatter;
import com.fueld.entry.dto.EntryAnalysis;
import com.fueld.entry.dto.EntryConfirmRequest;
import com.fueld.entry.dto.EntryConfirmResponse;
import com.fueld.entry.dto.EntryDraft;
import com.fueld.entry.dto.EntryParseRequest;
import com.fueld.entry.dto.EntryParseResponse;
import com.fueld.meal.MealService;
import com.fueld.meal.dto.MealLogResponse;
import com.fueld.meal.dto.TodaySummaryResponse;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import com.fueld.workout.MuscleGroups;
import com.fueld.workout.WorkoutService;
import com.fueld.workout.WorkoutType;
import com.fueld.workout.dto.WorkoutLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Freie Eingabe: ein Text kann mehrere Mahlzeiten und Trainings enthalten. {@link #parse}
 * erkennt sie mit einem einzigen KI-Call und speichert noch nichts, damit eine Rückfrage
 * zum Mahlzeit-Typ möglich ist. {@link #confirm} speichert danach alles oder nichts.
 */
@Service
@RequiredArgsConstructor
public class EntryService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");
    private static final Set<String> MEAL_TYPES = Set.of("breakfast", "lunch", "dinner", "snack");
    private static final Set<String> GOAL_RATINGS = Set.of("good", "neutral", "poor");
    private static final DateTimeFormatter NOW_FORMAT =
            DateTimeFormatter.ofPattern("EEEE, yyyy-MM-dd, HH:mm 'Uhr'", Locale.GERMAN);

    private final AiService aiService;
    private final MealService mealService;
    private final WorkoutService workoutService;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final LogContextFormatter logContextFormatter;

    public EntryParseResponse parse(User user, EntryParseRequest request) {
        ZonedDateTime now = ZonedDateTime.now(ZONE);
        String profileContext = profileRepository.findByUserId(user.getId())
                .map(logContextFormatter::formatProfile)
                .orElse("Kein Profil vorhanden.");
        GoalsResponse goals = profileService.getGoals(user);
        TodaySummaryResponse today = mealService.getTodaySummary(user);
        List<WorkoutLogResponse> workouts = workoutService.getTodayWorkouts(user);

        EntryAnalysis analysis = aiService.parseEntries(
                profileContext, NOW_FORMAT.format(now), formatToday(today, workouts),
                goals.calories(), goals.protein(),
                request.text(), request.photos());

        List<EntryDraft> items = analysis.items() == null ? List.of() : analysis.items().stream()
                .map(EntryService::toDraft)
                .map(item -> sanitize(item, now.toLocalDate()))
                .filter(Objects::nonNull)
                .toList();
        return new EntryParseResponse(items, analysis.message());
    }

    @Transactional
    public EntryConfirmResponse confirm(User user, EntryConfirmRequest request) {
        LocalDate today = LocalDate.now(ZONE);
        int meals = 0;
        int workouts = 0;
        for (EntryDraft raw : request.items()) {
            EntryDraft item = sanitize(raw, today);
            if (item == null) continue;
            if ("meal".equals(item.kind())) {
                mealService.saveParsed(user, item);
                meals++;
            } else {
                workoutService.saveParsed(user, item);
                workouts++;
            }
        }
        return new EntryConfirmResponse(meals, workouts);
    }

    /** Die KI-Antwort und der Rückweg vom Client sind Eingaben: unbekannte Werte werden entschärft. */
    static EntryDraft sanitize(EntryDraft item, LocalDate today) {
        boolean meal = "meal".equals(item.kind());
        if (!meal && !"workout".equals(item.kind())) return null;
        return new EntryDraft(
                item.kind(),
                item.text(),
                sanitizeDate(item.date(), today).toString(),
                item.summary(),
                item.feedback(),
                meal ? allowedOrNull(item.mealType(), MEAL_TYPES) : null,
                item.calories(),
                item.protein(),
                item.carbs(),
                item.fat(),
                item.goalAlignment(),
                allowedOrNull(item.goalRating(), GOAL_RATINGS),
                meal ? null : sanitizeWorkoutType(item.workoutType()).name(),
                item.durationMinutes(),
                item.distanceKm(),
                item.pacePerKm(),
                item.caloriesBurned(),
                meal ? null : MuscleGroups.sanitizeStored(item.muscleGroups()));
    }

    // Set.of(...).contains(null) wirft eine Exception, null ist hier aber ein gültiger Wert
    private static String allowedOrNull(String value, Set<String> allowed) {
        return value != null && allowed.contains(value) ? value : null;
    }

    private static LocalDate sanitizeDate(String date, LocalDate today) {
        try {
            LocalDate parsed = LocalDate.parse(date);
            return parsed.isAfter(today) ? today : parsed;
        } catch (RuntimeException e) {
            return today;
        }
    }

    private static WorkoutType sanitizeWorkoutType(String type) {
        try {
            return WorkoutType.valueOf(type);
        } catch (RuntimeException e) {
            return WorkoutType.other;
        }
    }

    private static EntryDraft toDraft(EntryAnalysis.Item item) {
        return new EntryDraft(
                item.kind(), item.text(), item.date(), item.summary(), item.feedback(), item.mealType(),
                item.calories(), item.protein(), item.carbs(), item.fat(),
                item.goalAlignment(), item.goalRating(), item.workoutType(), item.durationMinutes(),
                item.distanceKm(), item.pacePerKm(), item.caloriesBurned(), MuscleGroups.store(item.muscleGroups()));
    }

    private static String formatToday(TodaySummaryResponse today, List<WorkoutLogResponse> workouts) {
        List<String> lines = new ArrayList<>();
        for (MealLogResponse meal : today.meals()) {
            lines.add("- Mahlzeit (" + meal.mealType() + "): "
                    + (meal.summary() != null ? meal.summary() : meal.textInput()));
        }
        lines.addAll(workouts.stream()
                .map(w -> "- Training: " + w.type()
                        + (w.durationMinutes() != null ? ", " + w.durationMinutes() + " min" : "")
                        + (w.distanceKm() != null ? ", " + w.distanceKm() + " km" : ""))
                .collect(Collectors.toList()));
        return lines.isEmpty() ? "Heute ist noch nichts eingetragen." : String.join("\n", lines);
    }
}
