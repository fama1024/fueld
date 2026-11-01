package com.fueld.garmin;

import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Holt täglich neue Trainings aller Nutzer mit Garmin-Key (die Personal API ist Pull-only, es gibt
 * keinen Webhook). Standard 18:30 Uhr, also vor der Abend-Erinnerung um 19:00; via app.garmin.sync-cron
 * überschreibbar. Fehler werden nur geloggt: Ein abgelaufener Key stoppt weder die anderen Nutzer
 * noch die App.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GarminSyncScheduler {

    private final GarminConnectionService connections;
    private final GarminSyncService syncService;

    @Scheduled(cron = "${app.garmin.sync-cron:0 30 18 * * *}", zone = "Europe/Berlin")
    void dailySync() {
        for (User user : connections.connectedUsers()) {
            try {
                syncService.sync(user, GarminSyncService.DEFAULT_DAYS);
            } catch (Exception e) {
                log.warn("Garmin-Sync für Nutzer {} fehlgeschlagen: {}", user.getId(), e.getMessage());
            }
        }
    }
}
