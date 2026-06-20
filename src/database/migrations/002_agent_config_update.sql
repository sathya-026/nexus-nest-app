-- ============================================================
-- Nexus - Agent Configuration Update
-- ============================================================
-- Kept idempotent so it can be applied after an older initial schema or after
-- the current full initial schema.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(50) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS llm_model VARCHAR(255) NOT NULL DEFAULT 'gpt-4o-mini';

ALTER TABLE agents
  ALTER COLUMN llm_provider TYPE VARCHAR(50),
  ALTER COLUMN llm_provider SET DEFAULT 'openai',
  ALTER COLUMN llm_provider SET NOT NULL,
  ALTER COLUMN llm_model TYPE VARCHAR(255),
  ALTER COLUMN llm_model SET DEFAULT 'gpt-4o-mini',
  ALTER COLUMN llm_model SET NOT NULL,
  ALTER COLUMN access_type SET DEFAULT 'public',
  ALTER COLUMN access_type SET NOT NULL;
