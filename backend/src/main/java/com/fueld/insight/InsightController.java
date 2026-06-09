package com.fueld.insight;

import com.fueld.insight.dto.InsightResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/insights")
@RequiredArgsConstructor
public class InsightController {

    private final InsightService insightService;

    @PostMapping("/generate")
    public ResponseEntity<InsightResponse> generate(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "weekly") String type) {
        return ResponseEntity.ok(insightService.generate(user, type));
    }

    @PostMapping("/{id}/regenerate")
    public ResponseEntity<InsightResponse> regenerate(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(insightService.regenerate(user, id));
    }

    @GetMapping
    public ResponseEntity<List<InsightResponse>> getHistory(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(insightService.getHistory(user, type));
    }
}
