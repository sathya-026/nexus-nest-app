-- ============================================================
-- Nexus — Initial Schema Migration
-- Run via: npm run migration:run
-- ============================================================

-- pgvector extension (must be installed on the Postgres server first)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Configuration tables ──────────────────────────────────────────────────

CREATE TABLE organizations (
  id          UUID PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  api_key     VARCHAR(255) NOT NULL UNIQUE,
  plan        VARCHAR(50)  NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY,
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org_id ON users(org_id);

CREATE TABLE agents (
  id              UUID PRIMARY KEY,
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  system_prompt   TEXT        NOT NULL DEFAULT '',
  widget_config   JSONB       NOT NULL DEFAULT '{}',
  allowed_domains TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agents_org_id ON agents(org_id);

CREATE TABLE documents (
  id          UUID PRIMARY KEY,
  agent_id    UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  file_type   VARCHAR(50)  NOT NULL,
  s3_key      VARCHAR(1024) NOT NULL,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending',
  chunk_count INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_agent_id ON documents(agent_id);

CREATE TABLE document_chunks (
  id           BIGSERIAL PRIMARY KEY,
  document_id  UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  agent_id     UUID        NOT NULL REFERENCES agents(id)    ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  embedding    vector(1536),         -- pgvector column; NULL until indexed
  chunk_index  INT         NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL  DEFAULT NOW()
);
-- HNSW index for approximate nearest-neighbour search (much faster than exact IVFFlat at scale)
CREATE INDEX idx_chunks_embedding_hnsw
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
-- For filtering by agent before vector search
CREATE INDEX idx_chunks_agent_id ON document_chunks(agent_id);

CREATE TABLE tools (
  id                UUID        PRIMARY KEY,        -- NOTE: BIGSERIAL via TypeORM
  agent_id          UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT        NOT NULL,
  type              VARCHAR(50)  NOT NULL DEFAULT 'http',
  endpoint_url      VARCHAR(2048) NOT NULL,
  http_method       VARCHAR(10)  NOT NULL DEFAULT 'POST',
  headers           JSONB,                          -- AES-256 encrypted at app layer
  parameters_schema JSONB,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tools_agent_id ON tools(agent_id);

-- ── Runtime tables ────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id              UUID PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id      VARCHAR(255) UNIQUE NOT NULL,
  end_user_id     VARCHAR(255),
  total_tokens    INT         NOT NULL DEFAULT 0,
  message_count   INT         NOT NULL DEFAULT 0,
  status          VARCHAR(50)  NOT NULL DEFAULT 'active',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

-- ALTER TABLE conversations
--   ADD CONSTRAINT uq_conversations_session_id UNIQUE (session_id);

-- Sequence counter: one per conversation, set by trigger before insert.
-- This guarantees strict ordering without relying on timestamps or wall clock.
CREATE SEQUENCE messages_sequence_number_seq START 1;

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sequence_number INTEGER  NOT NULL,
  role            VARCHAR(50) NOT NULL,
  content         TEXT     NOT NULL,
  tokens_used     INT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, sequence_number)
);
CREATE INDEX idx_messages_conv_seq ON messages(conversation_id, sequence_number);

-- Trigger: auto-increment sequence_number scoped per conversation
CREATE OR REPLACE FUNCTION set_message_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequence_number := (
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    FROM messages
    WHERE conversation_id = NEW.conversation_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_sequence_number
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION set_message_sequence_number();

CREATE TABLE tool_calls (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tool_id     BIGINT      NOT NULL REFERENCES tools(id)    ON DELETE RESTRICT,
  input       JSONB,
  output      JSONB,
  status      VARCHAR(50)  NOT NULL DEFAULT 'success',
  latency_ms  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tool_calls_message_id ON tool_calls(message_id);

CREATE TABLE analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  agent_id        UUID        NOT NULL REFERENCES agents(id),
  conversation_id UUID        REFERENCES conversations(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_analytics_org_time    ON analytics_events(org_id, created_at);
CREATE INDEX idx_analytics_agent_event ON analytics_events(agent_id, event_type);
