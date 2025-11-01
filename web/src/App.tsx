import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectEditor = lazy(() => import('./pages/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const SiteAuth = lazy(() => import('./pages/SiteAuth').then(m => ({ default: m.SiteAuth })));

const LoadingFallback = () => <LoadingSpinner tip="Loading..." />;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/auth/:name" element={<SiteAuth />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Projects />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <Admin />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
