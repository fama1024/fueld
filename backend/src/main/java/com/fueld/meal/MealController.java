package com.fueld.meal;

import com.fueld.meal.dto.MealLogRequest;
import com.fueld.meal.dto.MealLogResponse;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
