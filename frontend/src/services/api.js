const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

// Auth
export const login = (e, p) => fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }).then(r => r.json());

// Stats
export const getStats = () => fetch(`${API}/stats`, { headers: h() }).then(r => r.json());

// Candidates
export const getCandidates = (params = '') => fetch(`${API}/candidates${params}`, { headers: h() }).then(r => r.json());
export const createCandidate = d => fetch(`${API}/candidates`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const updateCandidate = (id, d) => fetch(`${API}/candidates/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const deleteCandidate = id => fetch(`${API}/candidates/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

// Questions
export const getQuestions = (params = '') => fetch(`${API}/questions${params}`, { headers: h() }).then(r => r.json());
export const createQuestion = d => fetch(`${API}/questions`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const updateQuestion = (id, d) => fetch(`${API}/questions/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const deleteQuestion = id => fetch(`${API}/questions/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

// Interviews
export const getInterviews = (params = '') => fetch(`${API}/interviews${params}`, { headers: h() }).then(r => r.json());
export const createInterview = d => fetch(`${API}/interviews`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const deleteInterview = id => fetch(`${API}/interviews/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

// AI Agents
export const aiEvaluateCode = d => fetch(`${API}/agents/evaluate-code`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const aiGenerateQuestion = d => fetch(`${API}/agents/generate-question`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const aiInterviewReport = d => fetch(`${API}/agents/interview-report`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const aiPeerReviewSummary = d => fetch(`${API}/agents/peer-review-summary`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(async r => { if (r.status === 503) { const j = await r.json().catch(() => ({})); return { error: j.error || 'AI service unavailable (503)' }; } return r.json(); });

// NEW: Skill Gap Analysis
export const getSkillAssessments = (params = '') => fetch(`${API}/skills${params}`, { headers: h() }).then(r => r.json());
export const getSkillHeatmap = candidateId => fetch(`${API}/skills/heatmap/${candidateId}`, { headers: h() }).then(r => r.json());
export const analyzeSkills = candidateId => fetch(`${API}/skills/analyze/${candidateId}`, { method: 'POST', headers: h() }).then(r => r.json());

// NEW: Peer Reviews
export const getPeerReviews = (params = '') => fetch(`${API}/peer-reviews${params}`, { headers: h() }).then(r => r.json());
export const getPeerReviewsForSubmission = subId => fetch(`${API}/peer-reviews/submission/${subId}`, { headers: h() }).then(r => r.json());
export const createPeerReview = d => fetch(`${API}/peer-reviews`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const updatePeerReview = (id, d) => fetch(`${API}/peer-reviews/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const deletePeerReview = id => fetch(`${API}/peer-reviews/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());
export const getPeerReviewSummary = subId => fetch(`${API}/peer-reviews/submission/${subId}/summary`, { headers: h() }).then(r => r.json());

// NEW: Question Versioning
export const getQuestionVersions = qid => fetch(`${API}/question-versions/question/${qid}`, { headers: h() }).then(r => r.json());
export const snapshotQuestion = (qid, notes) => fetch(`${API}/question-versions/question/${qid}/snapshot`, { method: 'POST', headers: h(), body: JSON.stringify({ change_notes: notes }) }).then(r => r.json());
export const getQuestionCalibration = qid => fetch(`${API}/question-versions/question/${qid}/calibration`, { headers: h() }).then(r => r.json());
export const getAllCalibration = (params = '') => fetch(`${API}/question-versions/calibration${params}`, { headers: h() }).then(r => r.json());

// NEW: Ranking
export const computeRankings = () => fetch(`${API}/ranking/compute`, { method: 'POST', headers: h() }).then(r => r.json());
export const getRankings = (params = '') => fetch(`${API}/ranking${params}`, { headers: h() }).then(r => r.json());
export const getCandidateRanking = id => fetch(`${API}/ranking/candidate/${id}`, { headers: h() }).then(r => r.json());
export const recommendRoles = id => fetch(`${API}/ranking/candidate/${id}/recommend`, { method: 'POST', headers: h() }).then(r => r.json());

// NEW: Interview Replays
export const getReplay = (interviewId, params = '') => fetch(`${API}/replays/interview/${interviewId}${params}`, { headers: h() }).then(r => r.json());
export const getReplaySummary = interviewId => fetch(`${API}/replays/interview/${interviewId}/summary`, { headers: h() }).then(r => r.json());
export const recordReplayEvent = d => fetch(`${API}/replays`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const recordReplayBulk = events => fetch(`${API}/replays/bulk`, { method: 'POST', headers: h(), body: JSON.stringify({ events }) }).then(r => r.json());

// Notifications
export const getNotifications = () => fetch(`${API}/notifications`, { headers: h() }).then(r => r.json());
export const getUnreadCount = () => fetch(`${API}/notifications/unread-count`, { headers: h() }).then(r => r.json());
export const createNotification = d => fetch(`${API}/notifications`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const markNotificationRead = id => fetch(`${API}/notifications/${id}/read`, { method: 'PUT', headers: h() }).then(r => r.json());
export const markAllNotificationsRead = () => fetch(`${API}/notifications/mark-all-read`, { method: 'POST', headers: h() }).then(r => r.json());
export const deleteNotification = id => fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

// Apply pass 5 — Webhooks (Integration API gap)
export const getWebhooks = () => fetch(`${API}/webhooks`, { headers: h() }).then(r => r.json());
export const createWebhook = d => fetch(`${API}/webhooks`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const updateWebhook = (id, d) => fetch(`${API}/webhooks/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const deleteWebhook = id => fetch(`${API}/webhooks/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());
export const testWebhook = id => fetch(`${API}/webhooks/${id}/test`, { method: 'POST', headers: h() }).then(r => r.json());

// Reports
export const getReportSummary = () => fetch(`${API}/reports/summary`, { headers: h() }).then(r => r.json());
export const getCandidatesCsv = () => fetch(`${API}/reports/candidates.csv`, { headers: h() }).then(r => r.text());
export const getInterviewsCsv = () => fetch(`${API}/reports/interviews.csv`, { headers: h() }).then(r => r.text());
export const getQuestionsCsv = () => fetch(`${API}/reports/questions.csv`, { headers: h() }).then(r => r.text());

// Analytics
export const getAnalyticsOverview = () => fetch(`${API}/analytics/overview`, { headers: h() }).then(r => r.json());
export const getTopPerformers = (limit = 10) => fetch(`${API}/analytics/top-performers?limit=${limit}`, { headers: h() }).then(r => r.json());
export const getDifficultyStats = () => fetch(`${API}/analytics/difficulty-stats`, { headers: h() }).then(r => r.json());
export const getLanguagePopularity = () => fetch(`${API}/analytics/language-popularity`, { headers: h() }).then(r => r.json());
export const getCandidateAnalytics = id => fetch(`${API}/analytics/candidate/${id}`, { headers: h() }).then(r => r.json());
