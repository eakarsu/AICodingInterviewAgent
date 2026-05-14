import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
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

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState('dashboard');

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  const pages = {
    dashboard: <DashboardPage onNavigate={setPage} />,
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
  };

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}>
        <Sidebar active={page} onNavigate={setPage} />
        <div style={{ marginLeft: 240, padding: 30, flex: 1 }}>{pages[page] || pages.dashboard}</div>
      </div>
    </BrowserRouter>
  );
}

export default App;
