package com.fueld.meal;

import com.fueld.meal.dto.FromSavedMealRequest;
import com.fueld.meal.dto.MealLogRequest;
import com.fueld.meal.dto.MealLogResponse;
import com.fueld.meal.dto.QuickMealRequest;
import com.fueld.meal.dto.TodaySummaryResponse;
import com.fueld.meal.dto.WeekSummaryResponse;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;

    @PostMapping
    public ResponseEntity<MealLogResponse> logMeal(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MealLogRequest request) {
        return ResponseEntity.ok(mealService.logMeal(user, request));
    }

    @GetMapping
    public ResponseEntity<List<MealLogResponse>> getHistory(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mealService.getHistory(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MealLogResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(mealService.getById(user, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MealLogResponse> updateMeal(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody MealLogRequest request) {
        return ResponseEntity.ok(mealService.updateMeal(user, id, request));
    }

    @PostMapping("/quick")
    public ResponseEntity<MealLogResponse> quickLog(
            @AuthenticationPrincipal User user,
            @RequestBody QuickMealRequest request) {
        return ResponseEntity.ok(mealService.quickLog(user, request));
    }

    @PostMapping("/from-saved/{savedMealId}")
    public ResponseEntity<MealLogResponse> logFromSaved(
            @AuthenticationPrincipal User user,
            @PathVariable UUID savedMealId,
            @RequestBody(required = false) FromSavedMealRequest request) {
        return ResponseEntity.ok(mealService.logFromSaved(user, savedMealId, request));
    }

    @GetMapping("/today")
    public ResponseEntity<TodaySummaryResponse> getTodaySummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String date) {
        LocalDate parsed = (date != null && !date.isBlank())
                ? LocalDate.parse(date)
                : LocalDate.now(ZoneId.of("Europe/Berlin"));
        return ResponseEntity.ok(mealService.getTodaySummary(user, parsed));
    }

    @GetMapping("/week")
    public ResponseEntity<WeekSummaryResponse> getWeeklySummary(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mealService.getWeeklySummary(user));
    }
}
