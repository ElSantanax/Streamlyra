import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlatformConnection from './pages/PlatformConnection';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlatformConnection />} />
        <Route path="/connect" element={<PlatformConnection />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
