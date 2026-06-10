CREATE TABLE weight_log (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID        NOT NULL REFERENCES "user"(id),
    weight    DECIMAL(5,1) NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON weight_log(user_id, logged_at DESC);
