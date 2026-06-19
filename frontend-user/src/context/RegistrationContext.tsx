/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { HackXMember, HackXJrMember } from '../api/registration';

export interface XRegistrationState {
  email: string;
  pendingEmail: string;
  name: string;
  phone: string;
  nic: string;
  verificationToken: string;
  captchaSessionToken: string;
  stage: number;
  // Stage 3 fields
  teamName: string;
  university: string;
  expectations: string;
  source: string;
  ambassadorCode: string;
  consentShare: boolean;
  additionalMembers: Omit<HackXMember, 'is_leader'>[];
}

export interface JrRegistrationState {
  email: string;
  pendingEmail: string;
  name: string;
  phone: string;
  dob: string;
  verificationToken: string;
  captchaSessionToken: string;
  stage: number;
  // Stage 3 fields
  teamName: string;
  schoolName: string;
  schoolDistrict: string;
  teacherName: string;
  teacherPhone: string;
  teacherEmail: string;
  expectations: string;
  source: string;
  ambassadorCode: string;
  consentShare: boolean;
  additionalMembers: Omit<HackXJrMember, 'is_leader'>[];
}

const initialXState: XRegistrationState = {
  email: '',
  pendingEmail: '',
  name: '',
  phone: '',
  nic: '',
  verificationToken: '',
  captchaSessionToken: '',
  stage: 1,
  teamName: '',
  university: '',
  expectations: '',
  source: '',
  ambassadorCode: '',
  consentShare: true,
  additionalMembers: [],
};

const initialJrState: JrRegistrationState = {
  email: '',
  pendingEmail: '',
  name: '',
  phone: '',
  dob: '',
  verificationToken: '',
  captchaSessionToken: '',
  stage: 1,
  teamName: '',
  schoolName: '',
  schoolDistrict: '',
  teacherName: '',
  teacherPhone: '',
  teacherEmail: '',
  expectations: '',
  source: '',
  ambassadorCode: '',
  consentShare: true,
  additionalMembers: [],
};

const getInitialXState = (): XRegistrationState => {
  try {
    const saved = localStorage.getItem('hackx_x_registration');
    return saved ? { ...initialXState, ...JSON.parse(saved) } : initialXState;
  } catch {
    return initialXState;
  }
};

const getInitialJrState = (): JrRegistrationState => {
  try {
    const saved = localStorage.getItem('hackx_jr_registration');
    return saved ? { ...initialJrState, ...JSON.parse(saved) } : initialJrState;
  } catch {
    return initialJrState;
  }
};

interface RegistrationContextProps {
  xData: XRegistrationState;
  updateXData: (data: Partial<XRegistrationState>) => void;
  clearXData: () => void;
  jrData: JrRegistrationState;
  updateJrData: (data: Partial<JrRegistrationState>) => void;
  clearJrData: () => void;
  isLoading: boolean;
}

const RegistrationContext = createContext<RegistrationContextProps | null>(null);

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [xData, setXData] = useState<XRegistrationState>(getInitialXState);
  const [jrData, setJrData] = useState<JrRegistrationState>(getInitialJrState);
  const [isLoading, setIsLoading] = useState(true);

  const updateXData = useCallback((data: Partial<XRegistrationState>) => {
    setXData((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('hackx_x_registration', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearXData = useCallback(() => {
    setXData(initialXState);
    localStorage.removeItem('hackx_x_registration');
  }, []);

  const updateJrData = useCallback((data: Partial<JrRegistrationState>) => {
    setJrData((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('hackx_jr_registration', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearJrData = useCallback(() => {
    setJrData(initialJrState);
    localStorage.removeItem('hackx_jr_registration');
  }, []);

  // Parse ambassador code in URL query params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let code: string | null = null;
      for (const [key, value] of params.entries()) {
        if (key.toLowerCase() === 'ambasdercode' || key.toLowerCase() === 'ambassadorcode') {
          code = value;
          break;
        }
      }
      if (code) {
        localStorage.setItem('hackx_ambassador_code', code);
        // Also update active forms if not completed
        setTimeout(() => {
          updateXData({ ambassadorCode: code });
          updateJrData({ ambassadorCode: code });
        }, 0);
      }
    } catch (e) {
      console.error('Error parsing query params', e);
    } finally {
      setIsLoading(false);
    }
  }, [updateXData, updateJrData]);

  return (
    <RegistrationContext.Provider
      value={{
        xData,
        updateXData,
        clearXData,
        jrData,
        updateJrData,
        clearJrData,
        isLoading,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};
