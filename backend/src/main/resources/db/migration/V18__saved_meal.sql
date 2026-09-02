CREATE TABLE saved_meal (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    text_input   TEXT,
    calories     INTEGER,
    protein      INTEGER,
    carbs        INTEGER,
    fat          INTEGER,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_meal_user_id ON saved_meal(user_id);
