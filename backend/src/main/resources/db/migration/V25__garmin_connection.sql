-- Garmin-Zugang pro Nutzer. Der Key steht nur verschlüsselt hier (AES-GCM), das Geheimnis dazu
-- liegt in GARMIN_ENCRYPTION_KEY und nicht in der Datenbank. Die Mail braucht Garmin nicht, sie
-- zeigt nur, welches Konto verbunden ist.
CREATE TABLE garmin_connection (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL,
    api_key_encrypted TEXT        NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
