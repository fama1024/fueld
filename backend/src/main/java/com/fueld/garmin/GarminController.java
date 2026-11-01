package com.fueld.garmin;

import com.fueld.garmin.dto.GarminConnectionRequest;
import com.fueld.garmin.dto.GarminStatusResponse;
import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/garmin")
@RequiredArgsConstructor
public class GarminController {

    private final GarminSyncService syncService;
    private final GarminConnectionService connections;

    /** Ob der Import eingerichtet ist und der eingeloggte Nutzer einen Key hinterlegt hat. Der Key selbst kommt nie zurück. */
    @GetMapping("/status")
    public GarminStatusResponse status(@AuthenticationPrincipal User user) {
        return statusOf(user);
    }

    /** Speichert oder ändert Mail und Key des Nutzers. Ohne Key im Request bleibt der bisherige bestehen. */
    @PutMapping("/connection")
    public GarminStatusResponse save(@AuthenticationPrincipal User user, @Valid @RequestBody GarminConnectionRequest request) {
        if (!connections.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Garmin-Import nicht verfügbar");
        }
        try {
            connections.save(user, request.email(), request.apiKey());
        } catch (GarminKeyRejectedException | GarminKeyMissingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (GarminException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage(), e);
        }
        return statusOf(user);
    }

    /** Entfernt nur den Zugang, bereits importierte Trainings bleiben erhalten. */
    @DeleteMapping("/connection")
    public GarminStatusResponse remove(@AuthenticationPrincipal User user) {
        connections.remove(user);
        return statusOf(user);
    }

    /** {@code days}: wie weit zurück importiert wird (Standard 7; für die ganze Historie z.B. 3650). */
    @PostMapping("/sync")
    public GarminSyncResponse sync(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "" + GarminSyncService.DEFAULT_DAYS) int days) {
        if (!connections.isConnected(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Kein Garmin-Key hinterlegt");
        }
        try {
            return syncService.sync(user, days);
        } catch (GarminException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage(), e);
        }
    }

    private GarminStatusResponse statusOf(User user) {
        boolean connected = connections.isConnected(user);
        return new GarminStatusResponse(connections.isAvailable(), connected,
                connected ? connections.emailOf(user).orElse(null) : null);
    }
}
