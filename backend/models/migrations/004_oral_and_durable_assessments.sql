CREATE TABLE IF NOT EXISTS evidence_based_assessments (
  id BIGSERIAL PRIMARY KEY,
  assessment_ref TEXT NOT NULL UNIQUE,
  assessment_type TEXT NOT NULL CHECK(assessment_type IN ('oral-authenticity','durable-skills')),
  candidate_name TEXT NOT NULL,submission_title TEXT NOT NULL,scenario TEXT NOT NULL,
  communication_score INTEGER NOT NULL CHECK(communication_score BETWEEN 0 AND 100),
  collaboration_score INTEGER NOT NULL CHECK(collaboration_score BETWEEN 0 AND 100),
  creativity_score INTEGER NOT NULL CHECK(creativity_score BETWEEN 0 AND 100),
  critical_thinking_score INTEGER NOT NULL CHECK(critical_thinking_score BETWEEN 0 AND 100),
  leadership_score INTEGER NOT NULL CHECK(leadership_score BETWEEN 0 AND 100),
  understanding_score INTEGER NOT NULL CHECK(understanding_score BETWEEN 0 AND 100),
  authorship_consistency_score INTEGER NOT NULL CHECK(authorship_consistency_score BETWEEN 0 AND 100),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,reviewer TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('scheduled','interviewed','evidence_review','verified')),
  review_required BOOLEAN NOT NULL DEFAULT TRUE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
WITH kinds(kind,prefix) AS (VALUES('oral-authenticity','ORAL'),('durable-skills','DUR'))
INSERT INTO evidence_based_assessments(assessment_ref,assessment_type,candidate_name,submission_title,scenario,communication_score,collaboration_score,creativity_score,critical_thinking_score,leadership_score,understanding_score,authorship_consistency_score,evidence,reviewer,status)
SELECT k.prefix||'-'||LPAD(g::text,3,'0'),k.kind,
 (ARRAY['Amara Johnson','Liam Chen','Elena García','Mateo Wilson','Priya Shah'])[((g-1)%5)+1]||' · Cohort '||CEIL(g/5.0)::int,
 (ARRAY['Customer analytics capstone','Distributed systems design','Market-entry research paper','Operational automation portfolio','Responsible AI policy brief'])[((g-1)%5)+1],
 CASE WHEN k.kind='oral-authenticity' THEN 'Explain key decisions, defend sources, and solve a related unseen problem.' ELSE 'Lead a timed team exercise and produce a decision artifact under ambiguity.' END,
 60+(g*3)%38,58+(g*5)%40,57+(g*7)%41,63+(g*4)%36,54+(g*6)%43,64+(g*5)%35,61+(g*7)%38,
 jsonb_build_array(jsonb_build_object('kind','submitted-work','verified',true),jsonb_build_object('kind','oral-recording','verified',g%3<>0),jsonb_build_object('kind','review-rubric','verified',g%4<>0)),
 (ARRAY['Dr. Rivera','Morgan Lee','Casey Patel'])[((g-1)%3)+1],(ARRAY['scheduled','interviewed','evidence_review','verified'])[((g-1)%4)+1]
FROM kinds k CROSS JOIN generate_series(1,15) g ON CONFLICT(assessment_ref) DO NOTHING;
