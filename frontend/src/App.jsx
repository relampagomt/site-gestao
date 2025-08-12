import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import Clients from './admin/Clients';
import Materials from './admin/Materials';
import Actions from './admin/Actions';
import Vacancies from './admin/Vacancies';
import Settings from './admin/Settings';
import Users from './admin/Users';
import SupervisorDashboard from './pages/SupervisorDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="materials" element={<Materials />} />
              <Route path="actions" element={<Actions />} />
              <Route path="vacancies" element={<Vacancies />} />
              <Route path="settings" element={<Settings />} />
              <Route 
                path="usuarios" 
                element={
                  <RoleGuard roles={["admin"]}>
                    <Users />
                  </RoleGuard>
                } 
              />
            </Route>
            <Route 
              path="/supervisor" 
              element={
                <ProtectedRoute>
                  <SupervisorDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

