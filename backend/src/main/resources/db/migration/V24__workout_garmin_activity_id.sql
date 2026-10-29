ALTER TABLE workout_log ADD COLUMN garmin_activity_id BIGINT;

CREATE UNIQUE INDEX uq_workout_log_user_garmin
    ON workout_log (user_id, garmin_activity_id)
    WHERE garmin_activity_id IS NOT NULL;
