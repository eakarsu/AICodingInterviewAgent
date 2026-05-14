-- Migration v2 for AICodingInterviewAgent
-- Adds: ai_results JSONB, code_submissions, interview_questions, replays,
-- skill_assessments, peer_reviews, question_versions, candidate_rankings.

-- Ensure interviews table has the columns referenced by existing routes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_question_id') THEN
    ALTER TABLE interviews ADD COLUMN current_question_id INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='updated_at') THEN
    ALTER TABLE interviews ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_results') THEN
    ALTER TABLE interviews ADD COLUMN ai_results JSONB;
  END IF;
END$$;

-- Extend questions for versioning + tags
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='version') THEN
    ALTER TABLE questions ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='tags') THEN
    ALTER TABLE questions ADD COLUMN tags TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='avg_time_taken') THEN
    ALTER TABLE questions ADD COLUMN avg_time_taken NUMERIC(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='success_rate') THEN
    ALTER TABLE questions ADD COLUMN success_rate NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='ai_results') THEN
    ALTER TABLE questions ADD COLUMN ai_results JSONB;
  END IF;
END$$;

-- Code submissions
CREATE TABLE IF NOT EXISTS code_submissions (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  language VARCHAR(50),
  code TEXT,
  score NUMERIC(4,1),
  evaluation JSONB,
  ai_results JSONB,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Interview questions tracking
CREATE TABLE IF NOT EXISTS interview_questions (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  question_order INTEGER,
  asked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(interview_id, question_id)
);

-- Skill assessments (NEW: Skill Gap Analysis)
CREATE TABLE IF NOT EXISTS skill_assessments (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  proficiency_score NUMERIC(4,1),
  question_count INTEGER DEFAULT 0,
  ai_results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Peer reviews (NEW: Peer Code Review)
CREATE TABLE IF NOT EXISTS peer_reviews (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES code_submissions(id) ON DELETE CASCADE,
  reviewer_user_id INTEGER REFERENCES users(id),
  reviewer_name VARCHAR(255),
  comments TEXT,
  score NUMERIC(4,1),
  recommendation VARCHAR(50),
  line_annotations JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Question versions (NEW: Question Bank Versioning)
CREATE TABLE IF NOT EXISTS question_versions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  difficulty VARCHAR(20),
  category VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  change_notes TEXT,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question_id, version)
);

-- Candidate rankings (NEW: Candidate Ranking Engine)
CREATE TABLE IF NOT EXISTS candidate_rankings (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  experience_level VARCHAR(20),
  rank_in_level INTEGER,
  percentile NUMERIC(5,2),
  composite_score NUMERIC(5,2),
  ai_recommendations JSONB,
  computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candidate_id)
);

-- Interview replays (NEW: Interview Replay System)
CREATE TABLE IF NOT EXISTS interview_replays (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_payload JSONB,
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_replays_interview ON interview_replays(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_replays_time ON interview_replays(occurred_at);
CREATE INDEX IF NOT EXISTS idx_code_submissions_interview ON code_submissions(interview_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_candidate ON skill_assessments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON peer_reviews(submission_id);
