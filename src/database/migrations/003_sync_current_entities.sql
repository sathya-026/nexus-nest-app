-- ============================================================
-- Nexus - Sync Schema With Current Entities
-- ============================================================
-- This migration captures tables and schema objects added after the original
-- MVP schema. It is intentionally idempotent for local/dev databases.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(50) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS llm_model VARCHAR(255) NOT NULL DEFAULT 'gpt-4o-mini';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE tool_calls
  ALTER COLUMN tool_id DROP NOT NULL;

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'tool_calls'
      AND c.contype = 'f'
      AND a.attname = 'tool_id'
  LOOP
    EXECUTE format('ALTER TABLE tool_calls DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE tool_calls
  ADD CONSTRAINT tool_calls_tool_id_fkey
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_agent_access (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id   UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  granted_by UUID        NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_user_agent_access_agent_id ON user_agent_access(agent_id);

CREATE TABLE IF NOT EXISTS org_invitations (
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
CREATE INDEX IF NOT EXISTS idx_org_invitations_token_hash ON org_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON org_invitations(org_id);

CREATE TABLE IF NOT EXISTS widget_auth_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_widget_auth_tokens_agent_id ON widget_auth_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_widget_auth_tokens_token_hash ON widget_auth_tokens(token_hash);

CREATE TABLE IF NOT EXISTS widget_otp_codes (
  id         BIGSERIAL PRIMARY KEY,
  agent_id   UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  code_hash  VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  attempts   INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_widget_otp_codes_email_agent_created_at
  ON widget_otp_codes(email, agent_id, created_at);

-- The original SQL used a different trigger name. Normalize to the entity and
-- service expectation: one trigger that owns message.sequence_number.
DROP TRIGGER IF EXISTS trg_messages_sequence_number ON public.messages;
DROP TRIGGER IF EXISTS trg_set_message_sequence_number ON public.messages;

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

-- Align common index names with current entity query paths. The IF NOT EXISTS
-- clauses keep this safe for databases already created from the new initial schema.
CREATE INDEX IF NOT EXISTS idx_document_chunks_agent_id ON document_chunks(agent_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sequence
  ON messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_tool_calls_message_id ON tool_calls(message_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_id ON tool_calls(tool_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_created_at
  ON analytics_events(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_agent_event_type
  ON analytics_events(agent_id, event_type);
