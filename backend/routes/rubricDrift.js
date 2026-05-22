const express = require('express');
const router = express.Router();

router.post('/score', (req, res) => {
  const rubrics = Array.isArray(req.body?.rubrics) ? req.body.rubrics : [
    { skill: 'algorithms', expected_avg: 7.2, current_avg: 8.6, reviewer_variance: 1.4 },
    { skill: 'system_design', expected_avg: 6.8, current_avg: 6.5, reviewer_variance: 0.6 },
  ];
  const rows = rubrics.map((rubric) => {
    const drift = Math.abs(Number(rubric.current_avg || 0) - Number(rubric.expected_avg || 0));
    const variance = Number(rubric.reviewer_variance || 0);
    const score = Math.min(100, Math.round(drift * 22 + variance * 18));
    return { skill: rubric.skill, score, tier: score >= 45 ? 'recalibrate' : 'stable', action: score >= 45 ? 'Run interviewer calibration with anchor answers.' : 'Keep rubric live.' };
  });
  res.json({ recalibrationCount: rows.filter((row) => row.tier === 'recalibrate').length, rubrics: rows });
});

module.exports = router;
