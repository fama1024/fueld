ALTER TABLE meal_log ADD COLUMN eaten_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE workout_log ADD COLUMN performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE meal_log SET eaten_at = logged_at;
UPDATE workout_log SET performed_at = logged_at;
