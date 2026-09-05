CREATE TABLE assistant_message (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    scope       VARCHAR(10) NOT NULL,
    period_date DATE NOT NULL,
    role        VARCHAR(10) NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assistant_message_thread ON assistant_message(user_id, scope, period_date, created_at);
