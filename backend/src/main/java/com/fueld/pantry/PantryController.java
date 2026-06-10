package com.fueld.pantry;

import com.fueld.pantry.dto.PantryAddRequest;
import com.fueld.pantry.dto.PantryAnalyzeRequest;
import com.fueld.pantry.dto.PantryAnalysisResponse;
import com.fueld.pantry.dto.PantryExtractRequest;
import com.fueld.pantry.dto.PantryExtractedItem;
import com.fueld.pantry.dto.PantryItemResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pantry")
@RequiredArgsConstructor
public class PantryController {

    private final PantryService pantryService;

    @GetMapping
    public ResponseEntity<List<PantryItemResponse>> getItems(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pantryService.getItems(user));
    }

    @PostMapping("/items")
    public ResponseEntity<List<PantryItemResponse>> addItems(
            @AuthenticationPrincipal User user,
            @RequestBody PantryAddRequest request) {
        return ResponseEntity.ok(pantryService.addItems(user, request));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        pantryService.deleteItem(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/extract")
    public ResponseEntity<List<PantryExtractedItem>> extractFromPhoto(
            @AuthenticationPrincipal User user,
            @RequestBody PantryExtractRequest request) {
        return ResponseEntity.ok(pantryService.extractFromPhoto(request));
    }

    @PostMapping("/analyze")
    public ResponseEntity<PantryAnalysisResponse> analyze(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) PantryAnalyzeRequest request) {
        String note = request != null ? request.note() : null;
        return ResponseEntity.ok(pantryService.analyze(user, note));
    }
}
