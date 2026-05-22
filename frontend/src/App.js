import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import QuestionsPage from './pages/QuestionsPage';
import InterviewsPage from './pages/InterviewsPage';
import AgentsPage from './pages/AgentsPage';
import SkillGapPage from './pages/SkillGapPage';
import RankingPage from './pages/RankingPage';
import CalibrationPage from './pages/CalibrationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import WebhooksPage from './pages/WebhooksPage';
import CustomViewsPage from './pages/CustomViewsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';
import RubricDriftPage from './pages/RubricDriftPage';

function Shell() {
  const [page, setPage] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Sync URL <-> page state for the custom-views route
  useEffect(() => {
    if (location.pathname.startsWith('/custom-views') && page !== 'custom-views') {
      setPage('custom-views');
    }
  }, [location.pathname, page]);

  const handleNavigate = (key) => {
    setPage(key);
    if (key === 'custom-views') {
      navigate('/custom-views');
    } else if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const pages = {
    dashboard: <DashboardPage onNavigate={handleNavigate} />,
    candidates: <CandidatesPage />,
    questions: <QuestionsPage />,
    interviews: <InterviewsPage />,
    agents: <AgentsPage />,
    skills: <SkillGapPage />,
    ranking: <RankingPage />,
    calibration: <CalibrationPage />,
    analytics: <AnalyticsPage />,
    notifications: <NotificationsPage />,
    reports: <ReportsPage />,
    webhooks: <WebhooksPage />,
    'custom-views': <CustomViewsPage />,
    'rubric-drift': <RubricDriftPage />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}>
      <Sidebar active={page} onNavigate={handleNavigate} />
      <div style={{ marginLeft: 240, padding: 30, flex: 1 }}>
        <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="/rubric-drift" element={<RubricDriftPage />} />
          <Route path="*" element={pages[page] || pages.dashboard} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

export default App;
