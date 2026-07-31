import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegistrationProvider } from './context/RegistrationContext';

const Home = lazy(() => import('./pages/Home'));
const RegisterX = lazy(() => import('./pages/RegisterX'));
const RegisterJr = lazy(() => import('./pages/RegisterJr'));
const Success = lazy(() => import('./pages/Success'));
const Proposal = lazy(() => import('./pages/Proposal'));
const ProposalSuccess = lazy(() => import('./pages/ProposalSuccess'));

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
            
            {/* HackX (University) Routes */}
            <Route path="/x/registration" element={<RegisterX />} />
            <Route path="/x/registration-success" element={<Success />} />
            <Route path="/x/proposal" element={<Proposal tier="x" />} />
            <Route path="/x/proposal-success" element={<ProposalSuccess tier="x" />} />
            
            {/* HackX Jr (School) Routes */}
            <Route path="/jr/registration" element={<RegisterJr />} />
            <Route path="/jr/registration-success" element={<Success />} />
            <Route path="/jr/proposal" element={<Proposal tier="jr" />} />
            <Route path="/jr/proposal-success" element={<ProposalSuccess tier="jr" />} />

            {/* Legacy Fallbacks */}
            <Route path="/x" element={<Navigate to="/x/registration" replace />} />
            <Route path="/jr" element={<Navigate to="/jr/registration" replace />} />
            <Route path="/success" element={<Navigate to="/" replace />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </RegistrationProvider>
  );
};

export default App;
