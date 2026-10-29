package com.fueld.garmin;

import com.fueld.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Holt täglich neue Trainings von Garmin (die Personal API ist Pull-only, es gibt keinen Webhook).
 * Standard 18:30 Uhr, also vor der Abend-Erinnerung um 19:00; via app.garmin.sync-cron überschreibbar.
 * Fehler werden nur geloggt, damit ein abgelaufener Key nie die App beeinträchtigt.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GarminSyncScheduler {

    private final GarminClient client;
    private final GarminSyncService syncService;
    private final UserRepository userRepository;

    @Scheduled(cron = "${app.garmin.sync-cron:0 30 18 * * *}", zone = "Europe/Berlin")
    void dailySync() {
        if (!client.isConfigured() || syncService.syncUserEmail().isBlank()) return;

        userRepository.findByEmail(syncService.syncUserEmail()).ifPresentOrElse(user -> {
            try {
                syncService.sync(user);
            } catch (Exception e) {
                log.warn("Garmin-Sync fehlgeschlagen: {}", e.getMessage());
            }
        }, () -> log.warn("GARMIN_USER_EMAIL passt zu keinem Fueld-Nutzer"));
    }
}
