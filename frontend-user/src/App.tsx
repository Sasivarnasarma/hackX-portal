import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegistrationProvider } from './context/RegistrationContext';
import Home from './pages/Home';
import RegisterX from './pages/RegisterX';
import RegisterJr from './pages/RegisterJr';
import Success from './pages/Success';

const App: React.FC = () => {
  return (
    <RegistrationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/x" element={<RegisterX />} />
          <Route path="/jr" element={<RegisterJr />} />
          <Route path="/success" element={<Success />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RegistrationProvider>
  );
};

export default App;
