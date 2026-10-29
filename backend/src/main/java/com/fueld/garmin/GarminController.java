package com.fueld.garmin;

import com.fueld.garmin.dto.GarminStatusResponse;
import com.fueld.garmin.dto.GarminSyncResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/garmin")
@RequiredArgsConstructor
public class GarminController {

    private final GarminSyncService syncService;

    /** Ob der Garmin-Import für den eingeloggten Nutzer verfügbar ist (Frontend blendet den Button danach ein). */
    @GetMapping("/status")
    public GarminStatusResponse status(@AuthenticationPrincipal User user) {
        return new GarminStatusResponse(syncService.isEnabledFor(user));
    }

    @PostMapping("/sync")
    public GarminSyncResponse sync(@AuthenticationPrincipal User user) {
        if (!syncService.isEnabledFor(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Garmin-Import nicht verfügbar");
        }
        try {
            return syncService.sync(user);
        } catch (GarminException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage(), e);
        }
    }
}
