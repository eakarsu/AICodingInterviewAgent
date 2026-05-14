# Audit Note — AICodingInterviewAgent

Source: `_AUDIT/reports/batch_01.md` (Project 31)

## Maturity: PARTIAL-BUILD (11 routes; audit reports 0 AI endpoints)

## Original audit recommendations

### Gaps & Opportunities
- Missing AI Layer.
- Missing Notifications.
- Missing Reporting.

### Strategic Feature Suggestions
1. Agentic Workflow Orchestration
2. RAG over Domain Documents
3. Real-time Anomaly Detection
4. White-label/Reseller Platform

## Categorization
- **MECHANICAL:** notifications, reports/CSV exports.
- **NEEDS-PRODUCT-DECISION:** AI scoring agent (which model? safety guardrails for hiring decisions are critical), agentic interview, RAG.

## Implementations applied
1. **`backend/routes/notifications.js`** — full CRUD with DB-detect + memory fallback.
2. **`backend/routes/reports.js`** — `/summary`, `/candidates.csv`, `/interviews.csv`, `/questions.csv`.
3. **`backend/server.js`** — mounted at `/api/notifications` and `/api/reports`.

Syntax-checked with `node --check`.

## Backlog (prioritized)

### High priority
- **`POST /api/ai/score-interview`** — but requires careful design around hiring-bias guardrails.
- **`POST /api/ai/generate-question`** — produce a coding question matching skill + difficulty.
- **`POST /api/ai/peer-review-summary`** — synthesize multiple peer reviews into a hire/no-hire recommendation.

### Medium priority
- **Webhook integrations** for ATS systems (Greenhouse, Lever) — NEEDS-CREDS.
- **Real-time interview replay anomaly detection** (e.g., suspicious copy/paste patterns).

### Low priority
- White-label per-employer branding.
- Agentic full-loop interview where the AI candidate handles screening calls.

## Apply pass 3 (frontend)

Action: LEFT-AS-IS — frontend already wired to backend AI endpoints with JWT Bearer auth from localStorage. No idempotent changes required. See `_AUDIT/apply3_logs/ab3_66.md`.

## Apply pass 4 (mechanical backlog)

Implemented 1 mechanical backlog feature (cap 5; remaining backlog items are NEEDS-CREDS/NEEDS-PRODUCT-DECISION/TOO-RISKY for hiring-bias reasons):

1. **`POST /api/agents/peer-review-summary`** — synthesize multiple peer reviews into hire/no-hire recommendation with consensus, agreement level, divergent views. Reuses existing `callAI` helper in `routes/agents.js`; returns 503 when `OPENROUTER_API_KEY` missing.

Frontend:
- `src/services/api.js` — added `aiPeerReviewSummary` (handles 503 -> error message).
- `src/pages/AgentsPage.js` — added 4th tab "Peer Review Summary" with candidate name, role, peer reviews JSON textarea.

NOT implemented (skipped per category):
- `POST /api/ai/score-interview` — TOO-RISKY (hiring-bias guardrails per existing audit note).
- `POST /api/ai/generate-question` — already exists.
- ATS webhooks (Greenhouse, Lever) — NEEDS-CREDS.
- Anomaly-detection / white-label / agentic loop — NEEDS-PRODUCT-DECISION.

Syntax: `node --check` passes for `routes/agents.js` and `services/api.js`; `@babel/parser` parses JSX in `pages/AgentsPage.js`. No new deps. No `npm install`. Smoke test skipped.
