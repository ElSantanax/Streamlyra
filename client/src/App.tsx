import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Spinner from './components/common/Spinner';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AuthProvider } from './context/AuthProvider';
import { DialogProvider } from './lib/dialog';

const Landing = lazy(() => import('./pages/Landing'));
const PlatformConnection = lazy(() => import('./pages/PlatformConnection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider />
        <Suspense fallback={<Spinner fullScreen text="Preparando tu experiencia..." size="lg" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<PlatformConnection />} />
            <Route path="/register" element={<PlatformConnection />} />

            {/* Rutas protegidas */}
            <Route
              path="/connect"
              element={
                <ProtectedRoute>
                  <PlatformConnection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
