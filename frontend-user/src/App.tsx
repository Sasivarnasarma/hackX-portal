import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegistrationProvider } from './context/RegistrationContext';

const Home = lazy(() => import('./pages/Home'));
const RegisterX = lazy(() => import('./pages/RegisterX'));
const RegisterJr = lazy(() => import('./pages/RegisterJr'));
const Success = lazy(() => import('./pages/Success'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="spinner" style={{ width: '3rem', height: '3rem', borderColor: 'rgba(91, 184, 255, 0.2)', borderTopColor: 'var(--color-arc)' }}></div>
      <div className="text-muted-foreground text-sm font-semibold tracking-widest uppercase animate-pulse">Loading experience...</div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <RegistrationProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/x" element={<RegisterX />} />
            <Route path="/jr" element={<RegisterJr />} />
            <Route path="/success" element={<Success />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </RegistrationProvider>
  );
};

export default App;
