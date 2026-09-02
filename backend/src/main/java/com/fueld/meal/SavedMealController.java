package com.fueld.meal;

import com.fueld.meal.dto.SavedMealRequest;
import com.fueld.meal.dto.SavedMealResponse;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/saved-meals")
@RequiredArgsConstructor
public class SavedMealController {

    private final SavedMealService savedMealService;

    @GetMapping
    public ResponseEntity<List<SavedMealResponse>> getSavedMeals(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savedMealService.getSavedMeals(user));
    }

    @PostMapping
    public ResponseEntity<SavedMealResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SavedMealRequest request) {
        return ResponseEntity.ok(savedMealService.create(user, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        savedMealService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}
