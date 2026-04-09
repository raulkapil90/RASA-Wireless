import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import LogAnalysis from './pages/LogAnalysis';
import ConfigDoctor from './pages/ConfigDoctor';
import CatalystBridge from './pages/CatalystBridge';
import IpamForecast from './pages/IpamForecast';
import Configuration from './pages/Configuration';
import Compliance from './pages/Compliance';
import Jira from './pages/Jira';
import Salesforce from './pages/Salesforce';
import ExternalDashboards from './pages/ExternalDashboards';

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
            <Route index element={<Dashboard />} />
            <Route path="issues" element={<Incidents />} />
            <Route path="analysis" element={<LogAnalysis />} />
            <Route path="config-doctor" element={<ConfigDoctor />} />
            <Route path="catalyst-bridge" element={<CatalystBridge />} />
            <Route path="ipam-forecast" element={<IpamForecast />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="jira" element={<Jira />} />
            <Route path="salesforce" element={<Salesforce />} />
            <Route path="external-dashboards" element={<ExternalDashboards />} />
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
