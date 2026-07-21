'use strict';

const SESSION_TRANSITIONS = Object.freeze({
  draft: ['ready'], ready: ['in_progress', 'cancelled'], in_progress: ['submitted', 'cancelled'],
  submitted: ['evaluated'], evaluated: ['reviewed'], reviewed: [], cancelled: []
});

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
}

function validateProblem(problem) {
  assertObject(problem, 'problem');
  if (!problem.id || !problem.version || !problem.prompt) throw new Error('problem id, version, and prompt are required');
  if (!Array.isArray(problem.rubric) || problem.rubric.length === 0) throw new Error('a versioned rubric is required');
  if (!Array.isArray(problem.hiddenTests) || problem.hiddenTests.length === 0) throw new Error('hidden tests are required');
  const rubricWeight = problem.rubric.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (Math.abs(rubricWeight - 1) > 0.0001) throw new Error('rubric weights must total 1');
  return true;
}

function transitionSession(current, next, actorRole) {
  if (!(SESSION_TRANSITIONS[current] || []).includes(next)) throw new Error(`invalid transition ${current} -> ${next}`);
  if (['evaluated', 'reviewed'].includes(next) && !['instructor', 'reviewer', 'admin', 'runner'].includes(actorRole)) {
    throw new Error('role cannot complete this transition');
  }
  return next;
}

function gradeRunnerResult(problem, runnerResult) {
  validateProblem(problem);
  assertObject(runnerResult, 'runnerResult');
  if (!Array.isArray(runnerResult.tests)) throw new Error('signed runner test results are required');
  const expectedIds = new Set(problem.hiddenTests.map((test) => test.id));
  const received = new Map(runnerResult.tests.map((test) => [test.id, Boolean(test.passed)]));
  if (received.size !== expectedIds.size || [...expectedIds].some((id) => !received.has(id))) {
    throw new Error('runner result does not match the hidden-test manifest');
  }
  const correctness = [...expectedIds].filter((id) => received.get(id)).length / expectedIds.size;
  const rubricScores = Object.fromEntries(problem.rubric.map((item) => {
    const supplied = Number(runnerResult.rubricScores?.[item.id]);
    return [item.id, Number.isFinite(supplied) ? Math.max(0, Math.min(1, supplied)) : 0];
  }));
  const weighted = problem.rubric.reduce((sum, item) => sum + rubricScores[item.id] * item.weight, 0);
  return { correctness, rubricScores, score: Math.round((correctness * 0.7 + weighted * 0.3) * 100), hiddenTestCount: expectedIds.size };
}

function publicFeedback(result, evidence) {
  if (!Array.isArray(evidence) || evidence.some((item) => !item.source || !item.claim)) throw new Error('feedback evidence is required');
  return { score: result.score, rubricScores: result.rubricScores, evidence, hiddenTests: { total: result.hiddenTestCount } };
}

module.exports = { SESSION_TRANSITIONS, validateProblem, transitionSession, gradeRunnerResult, publicFeedback };
