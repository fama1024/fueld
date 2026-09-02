package com.fueld.push;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Feste tägliche Erinnerungen ans Loggen. Bewusst dumm: sendet zu zwei festen
 * Uhrzeiten an alle Subscriptions, kein adaptives Timing, keine Prüfung ob heute
 * schon geloggt wurde. Uhrzeiten via app.push.reminder.*-cron überschreibbar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderScheduler {

    private final PushService pushService;

    @Scheduled(cron = "${app.push.reminder.lunch-cron:0 30 12 * * *}", zone = "Europe/Berlin")
    void lunchReminder() {
        pushService.sendToEveryone(new PushMessage(
                "Mittagessen eingetragen? 🍽️",
                "Kurz die Mahlzeit loggen – dauert 20 Sekunden.",
                "/log"));
    }

    @Scheduled(cron = "${app.push.reminder.evening-cron:0 0 19 * * *}", zone = "Europe/Berlin")
    void eveningReminder() {
        pushService.sendToEveryone(new PushMessage(
                "Tag fast rum 🌙",
                "Trag noch deine Mahlzeiten und dein Training ein.",
                "/log"));
    }
}
