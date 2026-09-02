-- Altdaten-Fix: Bisher wurde jede Mahlzeit auf 12:00 Uhr (Europe/Berlin) gesetzt,
-- unabhängig vom meal_type. Ab sofort leitet das Backend die Uhrzeit aus dem meal_type ab
-- (Frühstück 8:00, Mittag 12:30, Abendessen 19:00, Snack 15:00). Diese Migration zieht
-- bestehende Einträge nach.
--
-- Nur Zeilen anfassen, deren Uhrzeit exakt 12:00:00 Berliner Zeit ist – das sind genau die
-- automatisch gesetzten. Quick-Log-Einträge (Instant.now()) haben eine echte Uhrzeit und
-- bleiben unberührt.
--
-- eaten_at ist TIMESTAMPTZ. "AT TIME ZONE 'Europe/Berlin'" rechnet den Zeitstempel in die
-- lokale Wanduhrzeit um; date_trunc('day', ...) gibt Mitternacht dieses Tages; nach dem
-- Addieren des Intervalls konvertiert ein zweites "AT TIME ZONE 'Europe/Berlin'" zurück in
-- einen TIMESTAMPTZ (DST-sicher).

UPDATE meal_log
SET eaten_at = (
        date_trunc('day', eaten_at AT TIME ZONE 'Europe/Berlin')
        + CASE meal_type
            WHEN 'breakfast' THEN INTERVAL '8 hours'
            WHEN 'lunch'     THEN INTERVAL '12 hours 30 minutes'
            WHEN 'dinner'    THEN INTERVAL '19 hours'
            WHEN 'snack'     THEN INTERVAL '15 hours'
          END
    ) AT TIME ZONE 'Europe/Berlin'
WHERE meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')
  AND (eaten_at AT TIME ZONE 'Europe/Berlin')::time = TIME '12:00:00';
