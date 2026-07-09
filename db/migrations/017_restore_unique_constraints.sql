-- Restore unique constraints dropped during 016 column rewrites.

CREATE UNIQUE INDEX IF NOT EXISTS reactions_vent_user_emoji_unique
  ON reactions (vent_id, user_id, emoji);

CREATE UNIQUE INDEX IF NOT EXISTS user_feedback_one_per_user_per_day
  ON user_feedback (user_id, feedback_date);