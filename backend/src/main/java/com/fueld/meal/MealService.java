package com.fueld.meal;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.fueld.ai.AiService;
import com.fueld.meal.dto.DayTotalResponse;
import com.fueld.meal.dto.FromSavedMealRequest;
import com.fueld.meal.dto.MacroBuckets;
import com.fueld.meal.dto.MealAnalysis;
import com.fueld.meal.dto.MealLogRequest;
import com.fueld.meal.dto.MealLogResponse;
import com.fueld.meal.dto.QuickMealRequest;
import com.fueld.meal.dto.TodaySummaryResponse;
import com.fueld.meal.dto.WeekSummaryResponse;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.profile.ProfileService;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealService {

    private final MealLogRepository mealLogRepository;
    private final SavedMealRepository savedMealRepository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public MealLogResponse logMeal(User user, MealLogRequest request) {
        String profileContext = buildProfileContext(user);
        GoalsResponse goals = profileService.getGoals(user);

        TodaySummaryResponse today = getTodaySummary(user);

        MealAnalysis analysis = aiService.analyzeMeal(
                profileContext, request.text(), request.photos(),
                request.mealType(),
                today.totalCalories(), today.totalProtein(), today.totalCarbs(), today.totalFat(),
                goals.calories(), goals.protein(), goals.carbs(), goals.fat());

        MealLog log = MealLog.builder()
                .user(user)
                .textInput(request.text())
                .summary(analysis.summary())
                .calories(analysis.calories())
                .protein(analysis.protein())
                .carbs(analysis.carbs())
                .fat(analysis.fat())
                .feedback(analysis.feedback())
                .tip(analysis.tip())
                .goalAlignment(analysis.goalAlignment())
                .ingredientTips(serializeTips(analysis.ingredientTips()))
                .mealType(request.mealType())
                .eatenAt(parseEatenAt(request.eatenAt(), request.mealType()))
                .build();

        return toResponse(mealLogRepository.save(log));
    }

    public List<MealLogResponse> getHistory(User user) {
        return mealLogRepository.findByUserIdOrderByEatenAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public MealLogResponse getById(User user, UUID id) {
        MealLog meal = mealLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!meal.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return toResponse(meal);
    }

    public TodaySummaryResponse getTodaySummary(User user) {
        return getTodaySummary(user, LocalDate.now(ZoneId.of("Europe/Berlin")));
    }

    public TodaySummaryResponse getTodaySummary(User user, LocalDate date) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);

        int calories = meals.stream().mapToInt(m -> m.getCalories() != null ? m.getCalories() : 0).sum();
        int protein  = meals.stream().mapToInt(m -> m.getProtein()  != null ? m.getProtein()  : 0).sum();
        int carbs    = meals.stream().mapToInt(m -> m.getCarbs()    != null ? m.getCarbs()    : 0).sum();
        int fat      = meals.stream().mapToInt(m -> m.getFat()      != null ? m.getFat()      : 0).sum();

        GoalsResponse goals = profileService.getGoals(user);
        MacroBuckets buckets = new MacroBuckets(
                MacroBuckets.bucket(calories, goals.calories()),
                MacroBuckets.bucket(protein,  goals.protein()),
                MacroBuckets.bucket(carbs,    goals.carbs()),
                MacroBuckets.bucket(fat,      goals.fat()));

        return new TodaySummaryResponse(calories, protein, carbs, fat, buckets,
                meals.stream().map(this::toResponse).toList());
    }

    public WeekSummaryResponse getWeeklySummary(User user) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        Instant from = monday.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);

        int calories = meals.stream().mapToInt(m -> m.getCalories() != null ? m.getCalories() : 0).sum();
        int protein  = meals.stream().mapToInt(m -> m.getProtein()  != null ? m.getProtein()  : 0).sum();
        int carbs    = meals.stream().mapToInt(m -> m.getCarbs()    != null ? m.getCarbs()    : 0).sum();
        int fat      = meals.stream().mapToInt(m -> m.getFat()      != null ? m.getFat()      : 0).sum();

        // Füllstand aus dem Tagesdurchschnitt dieser Woche (Summe / verstrichene Tage)
        // gegen das berechnete Tagesziel – nicht gegen ein 7-faches Wochenziel.
        long daysElapsed = ChronoUnit.DAYS.between(monday, today) + 1;
        GoalsResponse goals = profileService.getGoals(user);
        MacroBuckets buckets = new MacroBuckets(
                MacroBuckets.bucket((double) calories / daysElapsed, goals.calories()),
                MacroBuckets.bucket((double) protein  / daysElapsed, goals.protein()),
                MacroBuckets.bucket((double) carbs    / daysElapsed, goals.carbs()),
                MacroBuckets.bucket((double) fat      / daysElapsed, goals.fat()));

        return new WeekSummaryResponse(calories, protein, carbs, fat, buckets);
    }

    /** Tageswerte der letzten {@code days} Tage (inkl. heute), lückenlos – Tage ohne Eintrag liefern 0. */
    public List<DayTotalResponse> getTrend(User user, int days) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        LocalDate today = LocalDate.now(zone);
        LocalDate start = today.minusDays(days - 1L);
        Instant from = start.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to);

        java.util.Map<LocalDate, int[]> byDate = new java.util.HashMap<>();
        for (MealLog m : meals) {
            LocalDate d = m.getEatenAt().atZone(zone).toLocalDate();
            int[] agg = byDate.computeIfAbsent(d, k -> new int[4]);
            agg[0] += m.getCalories() != null ? m.getCalories() : 0;
            agg[1] += m.getProtein()  != null ? m.getProtein()  : 0;
            agg[2] += m.getCarbs()    != null ? m.getCarbs()    : 0;
            agg[3] += m.getFat()      != null ? m.getFat()      : 0;
        }

        List<DayTotalResponse> result = new java.util.ArrayList<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            int[] agg = byDate.getOrDefault(d, new int[4]);
            result.add(new DayTotalResponse(d, agg[0], agg[1], agg[2], agg[3]));
        }
        return result;
    }

    public MealLogResponse logFromSaved(User user, UUID savedMealId, FromSavedMealRequest request) {
        SavedMeal saved = savedMealRepository.findById(savedMealId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!saved.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        String mealType = request != null ? request.mealType() : null;
        String eatenAt = request != null ? request.eatenAt() : null;

        MealLog log = MealLog.builder()
                .user(user)
                .textInput(saved.getTextInput() != null ? saved.getTextInput() : saved.getName())
                .summary(saved.getName())
                .calories(saved.getCalories())
                .protein(saved.getProtein())
                .carbs(saved.getCarbs())
                .fat(saved.getFat())
                .mealType(mealType)
                .eatenAt(parseEatenAt(eatenAt, mealType))
                .build();

        saved.setLastUsedAt(Instant.now());
        savedMealRepository.save(saved);

        return toResponse(mealLogRepository.save(log));
    }

    public MealLogResponse quickLog(User user, QuickMealRequest request) {
        MealLog log = MealLog.builder()
                .user(user)
                .textInput(request.text() != null ? request.text() : "")
                .summary(request.summary())
                .calories(request.calories())
                .protein(request.protein())
                .carbs(request.carbs())
                .fat(request.fat())
                .mealType(request.mealType())
                .eatenAt(Instant.now())
                .build();
        return toResponse(mealLogRepository.save(log));
    }

    public MealLogResponse updateMeal(User user, UUID id, MealLogRequest request) {
        MealLog meal = mealLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!meal.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        String profileContext = buildProfileContext(user);
        GoalsResponse goals = profileService.getGoals(user);
        TodaySummaryResponse today = getTodaySummary(user);

        MealAnalysis analysis = aiService.analyzeMeal(
                profileContext, request.text(), request.photos(),
                request.mealType(),
                today.totalCalories(), today.totalProtein(), today.totalCarbs(), today.totalFat(),
                goals.calories(), goals.protein(), goals.carbs(), goals.fat());

        meal.setTextInput(request.text());
        meal.setSummary(analysis.summary());
        meal.setCalories(analysis.calories());
        meal.setProtein(analysis.protein());
        meal.setCarbs(analysis.carbs());
        meal.setFat(analysis.fat());
        meal.setFeedback(analysis.feedback());
        meal.setTip(analysis.tip());
        meal.setGoalAlignment(analysis.goalAlignment());
        meal.setIngredientTips(serializeTips(analysis.ingredientTips()));
        meal.setMealType(request.mealType());
        if (request.eatenAt() != null) meal.setEatenAt(parseEatenAt(request.eatenAt(), request.mealType()));

        return toResponse(mealLogRepository.save(meal));
    }

    /**
     * Baut den Aktivitätszeitpunkt aus dem Datum ("YYYY-MM-DD") und dem meal_type.
     * Eine Uhrzeit wird nicht erfasst, sondern aus der Mahlzeitenart abgeleitet
     * (Frühstück 8:00, Mittag 12:30, Abendessen 19:00, Snack 15:00) – so haben mehrere
     * Einträge am selben Tag eine plausible, unterscheidbare Uhrzeit statt alle 12:00.
     */
    private Instant parseEatenAt(String dateStr, String mealType) {
        if (dateStr == null || dateStr.isBlank()) return Instant.now();
        try {
            return LocalDate.parse(dateStr)
                    .atStartOfDay(ZoneId.of("Europe/Berlin"))
                    .plusMinutes(minutesForMealType(mealType))
                    .toInstant();
        } catch (Exception e) {
            return Instant.now();
        }
    }

    private long minutesForMealType(String mealType) {
        if (mealType == null) return 12 * 60;
        return switch (mealType) {
            case "breakfast" -> 8 * 60;
            case "lunch" -> 12 * 60 + 30;
            case "dinner" -> 19 * 60;
            case "snack" -> 15 * 60;
            default -> 12 * 60;
        };
    }

    private String serializeTips(List<String> tips) {
        if (tips == null || tips.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(tips);
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> deserializeTips(String json) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String buildProfileContext(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");
    }

    private String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        List<String> tags = profileService.deserializeGoalTags(p.getGoalTags());
        if (!tags.isEmpty()) sb.append("Ziele (ausgewählt): ").append(String.join(", ", tags)).append("\n");
        if (p.getGoals() != null) sb.append("Ziele (Freitext): ").append(p.getGoals()).append("\n");
        if (p.getDiet() != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports() != null) sb.append("Sport (allgemein betriebene Sportarten laut Profil, keine Aussage über heute): ").append(p.getSports()).append("\n");
        if (p.getBodyWeight() != null) sb.append("Gewicht: ").append(p.getBodyWeight()).append(" kg\n");
        if (p.getHeight() != null) sb.append("Größe: ").append(p.getHeight()).append(" cm\n");
        if (p.getAge() != null) sb.append("Alter: ").append(p.getAge()).append(" Jahre\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    private MealLogResponse toResponse(MealLog m) {
        return new MealLogResponse(
                m.getId(), m.getTextInput(), m.getSummary(),
                m.getCalories(), m.getProtein(), m.getCarbs(), m.getFat(),
                m.getFeedback(), m.getTip(), m.getGoalAlignment(),
                deserializeTips(m.getIngredientTips()),
                m.getMealType(), m.getEatenAt(), m.getLoggedAt()
        );
    }
}
