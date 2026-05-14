const router = require('express').Router();
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { parseAIJson } = require('../utils/parseAIJson');
const axios = require('axios');

router.use(auth);

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callAI(prompt, systemPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    return { success: false, error: 'OpenRouter API key not configured' };
  }
  try {
    const r = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 4096,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-coding-interview-agent',
          'X-Title': 'AI Coding Interview Agent',
        }
      }
    );
    const content = r.data.choices?.[0]?.message?.content || '';
    const parsed = parseAIJson(content);
    return { success: true, content, parsed: parsed.data, parseStrategy: parsed.strategy };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

router.post('/evaluate-code', aiRateLimiter, async (req, res) => {
  try {
    const { code, question, language } = req.body;
    if (!code || !question) return res.status(400).json({ error: 'code and question are required' });

    const systemPrompt = 'You are an expert software engineering interviewer. Always respond with valid JSON only.';
    const prompt = `Evaluate this coding solution.

Question: "${question}"
Language: ${language || 'javascript'}
Code:
${code}

Respond ONLY with valid JSON:
{
  "score": 7.5,
  "correctness_score": 8,
  "efficiency_score": 7,
  "code_quality_score": 7,
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "strengths": ["strength 1"],
  "improvements": ["improvement 1"],
  "edge_cases_handled": true,
  "overall_feedback": "brief"
}`;
    const result = await callAI(prompt, systemPrompt);
    if (!result.success) return res.status(502).json({ error: result.error });
    res.json({ ...result.parsed, _parseStrategy: result.parseStrategy, _raw: result.parsed ? undefined : result.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-question', aiRateLimiter, async (req, res) => {
  try {
    const { difficulty, category, skills } = req.body;

    const systemPrompt = 'You are an expert technical interviewer. Always respond with valid JSON only.';
    const prompt = `Generate a coding interview question.
Difficulty: ${difficulty || 'medium'}
Category: ${category || 'algorithms'}
Skills to test: ${skills || 'problem solving'}

Respond ONLY with valid JSON:
{
  "title": "title",
  "description": "full problem description",
  "example_input": "example",
  "example_output": "expected output",
  "constraints": ["constraint 1"],
  "hints": ["hint 1", "hint 2", "hint 3"],
  "expected_time_minutes": 30,
  "evaluation_criteria": ["criterion 1"],
  "follow_up_questions": ["question 1"]
}`;

    const result = await callAI(prompt, systemPrompt);
    if (!result.success) return res.status(502).json({ error: result.error });
    res.json({ ...result.parsed, _parseStrategy: result.parseStrategy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/peer-review-summary', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { reviews, candidate_name, role } = req.body;
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'reviews (array) is required' });
    }
    const systemPrompt = 'You are an expert hiring committee facilitator. Synthesize multiple peer reviews into a balanced, evidence-based recommendation. Always respond with valid JSON only.';
    const prompt = `Synthesize the following peer reviews into a hire/no-hire recommendation.
Candidate: ${candidate_name || 'unspecified'}
Role: ${role || 'unspecified'}
Reviews (JSON array): ${JSON.stringify(reviews)}

Respond ONLY with valid JSON:
{
  "consensus_recommendation": "hire|no_hire|maybe",
  "agreement_level": "high|medium|low",
  "score_summary": { "min": 0, "max": 0, "average": 0, "variance_note": "brief" },
  "shared_strengths": ["strength 1"],
  "shared_concerns": ["concern 1"],
  "divergent_views": ["where reviewers disagreed"],
  "evidence_highlights": ["specific cited example"],
  "next_steps": ["step 1"],
  "summary": "2-3 sentence committee-ready synthesis"
}`;
    const result = await callAI(prompt, systemPrompt);
    if (!result.success) return res.status(503).json({ error: result.error });
    res.json({ ...result.parsed, _parseStrategy: result.parseStrategy, _raw: result.parsed ? undefined : result.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/interview-report', aiRateLimiter, async (req, res) => {
  try {
    const { candidate_name, level, scores, questions_summary } = req.body;

    const systemPrompt = 'You are an expert interview committee analyst. Always respond with valid JSON only.';
    const prompt = `Generate an interview report.
Candidate: ${candidate_name}
Level: ${level}
Scores: ${JSON.stringify(scores)}
Questions: ${questions_summary}

Respond ONLY with valid JSON:
{
  "overall_assessment": "summary",
  "hire_recommendation": "yes|no|maybe",
  "confidence_level": "high|medium|low",
  "strengths": ["strength 1"],
  "areas_for_improvement": ["area 1"],
  "recommended_role": "role",
  "salary_range_suggestion": "$X-$Y",
  "comparison_to_level_average": "comparison",
  "detailed_feedback": "feedback",
  "next_steps": ["step 1"]
}`;

    const result = await callAI(prompt, systemPrompt);
    if (!result.success) return res.status(502).json({ error: result.error });
    res.json({ ...result.parsed, _parseStrategy: result.parseStrategy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
