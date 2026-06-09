CREATE TYPE workout_type AS ENUM ('running', 'crossfit', 'cycling', 'other');

CREATE TABLE workout_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type             workout_type NOT NULL DEFAULT 'other',
    duration_minutes INT,
    notes            TEXT,
    summary          TEXT,
    feedback         TEXT,
    ai_analysis      TEXT,
    logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_metric (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id  UUID NOT NULL REFERENCES workout_log(id) ON DELETE CASCADE,
    distance_km     DECIMAL(6,2),
    pace_per_km     TEXT,
    avg_heart_rate  INT,
    max_heart_rate  INT,
    calories_burned INT
);

CREATE INDEX idx_workout_log_user_id  ON workout_log(user_id);
CREATE INDEX idx_workout_log_logged_at ON workout_log(logged_at DESC);
