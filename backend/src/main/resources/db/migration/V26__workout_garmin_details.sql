-- Details aus Garmin: genauer Aktivitätstyp, Beschreibung und die zusammengefassten Übungen.
-- Die Übungen liegen als JSON-Text in einer Spalte, weil sie nur angezeigt und an die KI gegeben werden.
ALTER TABLE workout_log ADD COLUMN garmin_type_key VARCHAR(100);
ALTER TABLE workout_log ADD COLUMN garmin_description TEXT;
ALTER TABLE workout_log ADD COLUMN garmin_exercises TEXT;

-- Training Effect, von der Garmin-Uhr gemessen (Skala 0 bis 5) samt Bezeichnung
ALTER TABLE workout_log ADD COLUMN garmin_aerobic_effect DECIMAL(2,1);
ALTER TABLE workout_log ADD COLUMN garmin_anaerobic_effect DECIMAL(2,1);
ALTER TABLE workout_log ADD COLUMN garmin_effect_label VARCHAR(100);
