package com.fueld.workout;

import com.fueld.user.User;
import com.fueld.workout.dto.QuickWorkoutRequest;
import com.fueld.workout.dto.WorkoutLogRequest;
import com.fueld.workout.dto.WorkoutLogResponse;
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
@RequestMapping("/api/v1/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    @PostMapping
    public ResponseEntity<WorkoutLogResponse> logWorkout(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody WorkoutLogRequest request) {
        return ResponseEntity.ok(workoutService.logWorkout(user, request));
    }

    @PostMapping("/quick")
    public ResponseEntity<WorkoutLogResponse> quickLog(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody QuickWorkoutRequest request) {
        return ResponseEntity.ok(workoutService.quickLog(user, request));
    }

    @GetMapping
    public ResponseEntity<List<WorkoutLogResponse>> getHistory(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(workoutService.getHistory(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutLogResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(workoutService.getById(user, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkoutLogResponse> updateWorkout(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody WorkoutLogRequest request) {
        return ResponseEntity.ok(workoutService.updateWorkout(user, id, request));
    }

    @GetMapping("/today")
    public ResponseEntity<List<WorkoutLogResponse>> getTodayWorkouts(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String date) {
        LocalDate parsed = (date != null && !date.isBlank())
                ? LocalDate.parse(date)
                : LocalDate.now(ZoneId.of("Europe/Berlin"));
        return ResponseEntity.ok(workoutService.getTodayWorkouts(user, parsed));
    }
}
