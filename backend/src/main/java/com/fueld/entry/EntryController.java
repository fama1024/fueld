package com.fueld.entry;

import com.fueld.entry.dto.EntryConfirmRequest;
import com.fueld.entry.dto.EntryConfirmResponse;
import com.fueld.entry.dto.EntryParseRequest;
import com.fueld.entry.dto.EntryParseResponse;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/entries")
@RequiredArgsConstructor
public class EntryController {

    private final EntryService entryService;

    /** Erkennt Mahlzeiten und Trainings in freiem Text, speichert aber noch nichts. */
    @PostMapping("/parse")
    public ResponseEntity<EntryParseResponse> parse(
            @AuthenticationPrincipal User user,
            @RequestBody EntryParseRequest request) {
        return ResponseEntity.ok(entryService.parse(user, request));
    }

    /** Speichert die erkannten Einträge, gegebenenfalls nach der Rückfrage. */
    @PostMapping("/confirm")
    public ResponseEntity<EntryConfirmResponse> confirm(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody EntryConfirmRequest request) {
        return ResponseEntity.ok(entryService.confirm(user, request));
    }
}
