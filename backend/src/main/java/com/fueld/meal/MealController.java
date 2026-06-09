package com.fueld.meal;

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

    @GetMapping("/today")
    public ResponseEntity<TodaySummaryResponse> getTodaySummary(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mealService.getTodaySummary(user));
    }

    @GetMapping("/week")
    public ResponseEntity<WeekSummaryResponse> getWeeklySummary(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(mealService.getWeeklySummary(user));
    }
}
