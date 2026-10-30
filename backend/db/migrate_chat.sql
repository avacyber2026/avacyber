CREATE TABLE IF NOT EXISTS chat_channels (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100),
  type       VARCHAR(20) NOT NULL DEFAULT 'channel',
  created_by VARCHAR(255),
  tenant_id  VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
  channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_email)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           SERIAL PRIMARY KEY,
  channel_id   INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_name  VARCHAR(255),
  text         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);

-- Seed default channels
INSERT INTO chat_channels (name, type, created_by)
SELECT v.name, 'channel', 'system'
FROM (VALUES ('general'), ('incidents'), ('alerts')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM chat_channels c WHERE c.name = v.name AND c.type = 'channel'
);
