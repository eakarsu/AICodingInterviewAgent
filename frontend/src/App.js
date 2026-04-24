import React, { useState } from 'react'; import { BrowserRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar'; import LoginPage from './pages/LoginPage'; import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage'; import QuestionsPage from './pages/QuestionsPage';
import InterviewsPage from './pages/InterviewsPage'; import AgentsPage from './pages/AgentsPage';
function App() { const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token')); const [page, setPage] = useState('dashboard');
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  const pages = { dashboard: <DashboardPage onNavigate={setPage} />, candidates: <CandidatesPage />, questions: <QuestionsPage />, interviews: <InterviewsPage />, agents: <AgentsPage /> };
  return (<BrowserRouter><div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}><Sidebar active={page} onNavigate={setPage} /><div style={{ marginLeft: 240, padding: 30, flex: 1 }}>{pages[page] || pages.dashboard}</div></div></BrowserRouter>);
}
export default App;
