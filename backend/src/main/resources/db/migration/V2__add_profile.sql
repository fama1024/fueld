CREATE TABLE profile (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    goals       TEXT,
    diet        TEXT,
    sports      TEXT,
    body_weight DECIMAL(5,2),
    height      INT,
    age         INT,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
