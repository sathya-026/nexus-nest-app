-- ============================================================
-- Nexus - Initial Schema Migration
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core tenant tables

CREATE TABLE organizations (
  id          UUID PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  api_key     VARCHAR(255) NOT NULL UNIQUE,
  plan        VARCHAR(50)  NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY,
  org_id        UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org_id ON users(org_id);

CREATE TABLE agents (
  id              UUID PRIMARY KEY,
  org_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  system_prompt   TEXT         NOT NULL,
  widget_config   JSONB        NOT NULL DEFAULT '{}',
  access_type     VARCHAR(50)  NOT NULL DEFAULT 'public',
  allowed_domains TEXT,
  llm_provider    VARCHAR(50)  NOT NULL DEFAULT 'openai',
  llm_model       VARCHAR(255) NOT NULL DEFAULT 'gpt-4o-mini',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agents_org_id ON agents(org_id);

-- Knowledge base tables

CREATE TABLE documents (
  id          UUID PRIMARY KEY,
  agent_id    UUID          NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  file_type   VARCHAR(50)   NOT NULL,
  s3_key      VARCHAR(1024) NOT NULL,
  status      VARCHAR(50)   NOT NULL DEFAULT 'pending',
  description TEXT          NOT NULL DEFAULT '',
  chunk_count INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_agent_id ON documents(agent_id);

CREATE TABLE document_chunks (
  id           BIGSERIAL PRIMARY KEY,
  document_id  UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  agent_id     UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  embedding    vector(1536) NOT NULL,
  chunk_index  INT         NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_document_chunks_agent_id ON document_chunks(agent_id);
CREATE INDEX idx_document_chunks_embedding_hnsw
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Tool registry

CREATE TABLE tools (
  id                BIGSERIAL PRIMARY KEY,
  agent_id          UUID          NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name              VARCHAR(255)  NOT NULL,
  description       TEXT          NOT NULL,
  type              VARCHAR(50)   NOT NULL DEFAULT 'http',
  endpoint_url      VARCHAR(2048) NOT NULL,
  http_method       VARCHAR(10)   NOT NULL DEFAULT 'POST',
  headers           JSONB,
  parameters_schema JSONB,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tools_agent_id ON tools(agent_id);

-- Conversation runtime

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id      VARCHAR(255) NOT NULL UNIQUE,
  end_user_id     VARCHAR(255),
  total_tokens    INT          NOT NULL DEFAULT 0,
  message_count   INT          NOT NULL DEFAULT 0,
  status          VARCHAR(50)  NOT NULL DEFAULT 'active',
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sequence_number INT         NOT NULL,
  role            VARCHAR(50) NOT NULL,
  content         TEXT        NOT NULL,
  tokens_used     INT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_messages_conversation_sequence UNIQUE (conversation_id, sequence_number)
);
CREATE INDEX idx_messages_conversation_sequence ON messages(conversation_id, sequence_number);

CREATE OR REPLACE FUNCTION set_message_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO NEW.sequence_number
  FROM public.messages
  WHERE conversation_id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_message_sequence_number
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_sequence_number();

CREATE TABLE tool_calls (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tool_id     BIGINT      REFERENCES tools(id) ON DELETE SET NULL,
  input       JSONB,
  output      JSONB,
  status      VARCHAR(50) NOT NULL DEFAULT 'success',
  latency_ms  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tool_calls_message_id ON tool_calls(message_id);
CREATE INDEX idx_tool_calls_tool_id ON tool_calls(tool_id);

-- Analytics

CREATE TABLE analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID         NOT NULL REFERENCES organizations(id),
  agent_id        UUID         NOT NULL REFERENCES agents(id),
  conversation_id UUID         REFERENCES conversations(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_analytics_events_org_created_at ON analytics_events(org_id, created_at);
CREATE INDEX idx_analytics_events_agent_event_type ON analytics_events(agent_id, event_type);

-- Team and invitations

CREATE TABLE user_agent_access (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id   UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  granted_by UUID        NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, agent_id)
);
CREATE INDEX idx_user_agent_access_agent_id ON user_agent_access(agent_id);

CREATE TABLE org_invitations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email              VARCHAR(255) NOT NULL,
  role               VARCHAR(10)  NOT NULL,
  token_hash         VARCHAR(255) NOT NULL,
  invited_by         UUID         NOT NULL REFERENCES users(id),
  agent_restrictions JSONB,
  expires_at         TIMESTAMPTZ  NOT NULL,
  accepted_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_invitations_org_email UNIQUE (org_id, email)
);
CREATE INDEX idx_org_invitations_token_hash ON org_invitations(token_hash);
CREATE INDEX idx_org_invitations_org_id ON org_invitations(org_id);

-- Widget authentication

CREATE TABLE widget_auth_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_widget_auth_tokens_agent_id ON widget_auth_tokens(agent_id);
CREATE INDEX idx_widget_auth_tokens_token_hash ON widget_auth_tokens(token_hash);

CREATE TABLE widget_otp_codes (
  id         BIGSERIAL PRIMARY KEY,
  agent_id   UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  code_hash  VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  attempts   INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_widget_otp_codes_email_agent_created_at
  ON widget_otp_codes(email, agent_id, created_at);
