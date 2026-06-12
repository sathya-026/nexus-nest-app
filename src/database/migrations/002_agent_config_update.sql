ALTER TABLE agents
  ADD COLUMN llm_provider TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN llm_model    TEXT NOT NULL DEFAULT 'gpt-4o-mini';