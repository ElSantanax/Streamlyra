import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from './components/common/Spinner';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import { AuthProvider } from './context/AuthProvider';
import { ConnectionsProvider } from './context/ConnectionsProvider';
import { DialogProvider } from './lib/dialog';

const Landing = lazy(() => import('./pages/Landing'));
const PlatformConnection = lazy(() => import('./pages/PlatformConnection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const OverlayChat = lazy(() => import('./pages/OverlayChat'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

function App() {
  const { t } = useTranslation();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <DialogProvider />
        <ConnectionsProvider>
          <Suspense fallback={<Spinner fullScreen text={t('common.loading')} size="lg" />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/login" element={<PlatformConnection />} />
              <Route path="/register" element={<PlatformConnection />} />
              <Route path="/overlay/chat/:token" element={<OverlayChat />} />

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
        </ConnectionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
