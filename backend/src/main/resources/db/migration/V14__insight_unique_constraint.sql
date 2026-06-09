-- Duplikate entfernen: pro (user_id, type, period_start) nur den neuesten Eintrag behalten
DELETE FROM ai_insight a
USING ai_insight b
WHERE a.user_id = b.user_id
  AND a.type = b.type
  AND a.period_start = b.period_start
  AND a.created_at < b.created_at;

ALTER TABLE ai_insight ADD CONSTRAINT uq_ai_insight_user_type_period
    UNIQUE (user_id, type, period_start);
