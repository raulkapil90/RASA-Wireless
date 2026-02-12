import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Incidents = React.lazy(() => import('./pages/Incidents'));
const LogAnalysis = React.lazy(() => import('./pages/LogAnalysis'));
const CliTranslator = React.lazy(() => import('./pages/CliTranslator'));

// Placeholder components for KB and Reports
const Placeholder = ({ title }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-brand-border rounded-3xl bg-white shadow-inner max-w-3xl mx-auto my-12">
    <div className="bg-brand-orange/5 p-6 rounded-3xl mb-6 ring-1 ring-brand-orange/10">
      <div className="w-12 h-12 text-brand-orange flex items-center justify-center font-black text-2xl">?</div>
    </div>
    <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{title}</h2>
    <p className="text-brand-muted font-medium max-w-md mx-auto leading-relaxed">This feature is currently under development in the RASA roadmap. AI-powered knowledge base indexing is coming soon.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <React.Suspense fallback={<div className="p-8 text-brand-muted font-bold flex items-center gap-2"><div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" /> Loading RASA Hub...</div>}>
                <Dashboard />
              </React.Suspense>
            } />
            <Route path="issues" element={
              <React.Suspense fallback={<div className="p-8 text-brand-muted font-bold flex items-center gap-2"><div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" /> Retrieving Incidents...</div>}>
                <Incidents />
              </React.Suspense>
            } />
            <Route path="analysis" element={
              <React.Suspense fallback={<div className="p-8 text-brand-muted font-bold flex items-center gap-2"><div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" /> Initializing AI Agent...</div>}>
                <LogAnalysis />
              </React.Suspense>
            } />
            <Route path="translator" element={
              <React.Suspense fallback={<div className="p-8 text-brand-muted font-bold flex items-center gap-2"><div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" /> Synchronizing Vendors...</div>}>
                <CliTranslator />
              </React.Suspense>
            } />
            <Route path="kb" element={<Placeholder title="Knowledge Base" />} />
            <Route path="reports" element={<Placeholder title="Reports" />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
            <Route path="logout" element={<Placeholder title="Logging Out" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
