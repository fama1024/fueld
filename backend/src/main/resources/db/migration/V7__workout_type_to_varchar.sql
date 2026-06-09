-- Default hängt am alten ENUM-Typ, muss zuerst entfernt werden
ALTER TABLE workout_log ALTER COLUMN type DROP DEFAULT;

-- Spalte von PostgreSQL ENUM zu VARCHAR konvertieren
ALTER TABLE workout_log ALTER COLUMN type TYPE VARCHAR(20) USING type::text;

-- Default als plain String neu setzen
ALTER TABLE workout_log ALTER COLUMN type SET DEFAULT 'other';

-- ENUM-Typ kann jetzt gelöscht werden
DROP TYPE IF EXISTS workout_type;
