CREATE TABLE pantry_item (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    quantity   TEXT,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pantry_item_user_id ON pantry_item(user_id);
