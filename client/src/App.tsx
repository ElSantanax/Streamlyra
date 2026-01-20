import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const PlatformConnection = lazy(() => import('./pages/PlatformConnection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium animate-pulse text-slate-500 dark:text-slate-400">Preparando tu experiencia...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<PlatformConnection />} />
          <Route path="/connect" element={<PlatformConnection />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
