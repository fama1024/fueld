package com.fueld.weight;

import com.fueld.user.User;
import com.fueld.weight.dto.BodyCompositionAnalysis;
import com.fueld.weight.dto.WeightAnalyzeRequest;
import com.fueld.weight.dto.WeightLogRequest;
import com.fueld.weight.dto.WeightLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/weight")
@RequiredArgsConstructor
public class WeightController {

    private final WeightService weightService;

    @PostMapping
    public ResponseEntity<WeightLogResponse> log(
            @RequestBody WeightLogRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(weightService.log(user, req));
    }

    @PostMapping("/analyze")
    public ResponseEntity<BodyCompositionAnalysis> analyze(
            @RequestBody WeightAnalyzeRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(weightService.analyze(req));
    }

    @GetMapping
    public ResponseEntity<List<WeightLogResponse>> getHistory(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(weightService.getHistory(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WeightLogResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(weightService.getById(user, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        weightService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}
