CREATE TABLE meal_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    text_input  TEXT NOT NULL,
    summary     TEXT,
    calories    INT,
    protein     INT,
    carbs       INT,
    fat         INT,
    feedback    TEXT,
    tip         TEXT,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_log_user_id ON meal_log(user_id);
CREATE INDEX idx_meal_log_logged_at ON meal_log(logged_at DESC);
