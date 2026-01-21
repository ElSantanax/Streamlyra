import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Spinner from './components/common/Spinner';

const Landing = lazy(() => import('./pages/Landing'));
const PlatformConnection = lazy(() => import('./pages/PlatformConnection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner fullScreen text="Preparando tu experiencia..." size="lg" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<PlatformConnection />} />
          <Route path="/connect" element={<PlatformConnection />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
