CREATE TABLE ai_insight (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_insight_user_id ON ai_insight(user_id);
CREATE INDEX idx_ai_insight_created_at ON ai_insight(created_at DESC);
