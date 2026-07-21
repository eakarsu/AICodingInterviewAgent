const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProblem, transitionSession, gradeRunnerResult, publicFeedback } = require('../domain/interviewWorkflow');

const problem = { id: 'p1', version: 2, prompt: 'Solve it', rubric: [{ id: 'quality', weight: 1 }], hiddenTests: [{ id: 'h1' }, { id: 'h2' }] };
test('requires curated versioned rubric and hidden tests', () => {
  assert.equal(validateProblem(problem), true);
  assert.throws(() => validateProblem({ ...problem, hiddenTests: [] }), /hidden tests/);
});
test('grades only an exact hidden-test manifest', () => {
  assert.equal(gradeRunnerResult(problem, { tests: [{ id: 'h1', passed: true }, { id: 'h2', passed: false }], rubricScores: { quality: 1 } }).score, 65);
  assert.throws(() => gradeRunnerResult(problem, { tests: [{ id: 'h1', passed: true }] }), /manifest/);
});
test('does not disclose hidden cases and gates review', () => {
  assert.throws(() => transitionSession('evaluated', 'reviewed', 'candidate'), /role/);
  const feedback = publicFeedback({ score: 80, rubricScores: {}, hiddenTestCount: 2 }, [{ source: 'runner:h1', claim: 'Correctness evidence' }]);
  assert.deepEqual(feedback.hiddenTests, { total: 2 });
  assert.equal(JSON.stringify(feedback).includes('input'), false);
});
