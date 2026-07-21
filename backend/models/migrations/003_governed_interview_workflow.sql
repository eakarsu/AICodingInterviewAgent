BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'candidate';
CREATE TABLE IF NOT EXISTS coding_problems (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, external_key text NOT NULL, version integer NOT NULL CHECK (version > 0),
  prompt text NOT NULL, rubric jsonb NOT NULL CHECK (jsonb_typeof(rubric) = 'array'), hidden_test_manifest jsonb NOT NULL,
  dataset_source text NOT NULL, approved_by text, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_key, version)
);
CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, candidate_id text NOT NULL, problem_id uuid NOT NULL REFERENCES coding_problems(id),
  status text NOT NULL CHECK (status IN ('draft','ready','in_progress','submitted','evaluated','reviewed','cancelled')),
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 60 AND 14400), ai_disclosure_accepted_at timestamptz,
  rubric_snapshot jsonb NOT NULL, started_at timestamptz, due_at timestamptz, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS code_submissions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, session_id uuid NOT NULL REFERENCES interview_sessions(id), idempotency_key text NOT NULL,
  source_object_key text NOT NULL, source_sha256 char(64) NOT NULL, language text NOT NULL, status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed')),
  runner_job_id text, score integer CHECK (score BETWEEN 0 AND 100), feedback jsonb, failure_code text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS interview_audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, aggregate_id uuid NOT NULL, actor_id text,
  event_type text NOT NULL, event_data jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_tenant_candidate ON interview_sessions(tenant_id, candidate_id, created_at DESC);
COMMIT;
