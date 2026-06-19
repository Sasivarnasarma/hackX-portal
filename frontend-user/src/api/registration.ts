import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SendOTPPayload {
  email: string;
  turnstile_token: string;
  purpose: 'hackx_registration' | 'hackx_jr_registration';
}

export interface SendOTPResponse {
  status: string;
  message: string;
  email: string;
  captcha_session_token: string;
}

export interface ResendOTPPayload {
  email: string;
  captcha_session_token: string;
  purpose: 'hackx_registration' | 'hackx_jr_registration';
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
  captcha_session_token: string;
  purpose: 'hackx_registration' | 'hackx_jr_registration';
}

export interface VerifyOTPResponse {
  status: string;
  message: string;
  verification_token: string;
}

export interface HackXMember {
  name: string;
  nic: string;
  phone: string;
  email: string;
  is_leader: boolean;
}

export interface HackXRegisterPayload {
  team_name: string;
  university: string;
  consent_share: boolean;
  expectations: string;
  source: string;
  ambassador_code?: string;
  verification_token: string;
  members: HackXMember[];
}

export interface HackXJrMember {
  name: string;
  dob: string; // YYYY-MM-DD
  phone: string;
  email: string;
  is_leader: boolean;
}

export interface HackXJrRegisterPayload {
  team_name: string;
  school_name: string;
  school_district: string;
  teacher_name: string;
  teacher_phone: string;
  teacher_email: string;
  consent_share: boolean;
  expectations: string;
  source: string;
  ambassador_code?: string;
  verification_token: string;
  members: HackXJrMember[];
}

export const registrationAPI = {
  sendOTP: async (payload: SendOTPPayload): Promise<SendOTPResponse> => {
    const response = await api.post<SendOTPResponse>('/otp/send', payload);
    return response.data;
  },

  resendOTP: async (payload: ResendOTPPayload): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/otp/resend', payload);
    return response.data;
  },

  verifyOTP: async (payload: VerifyOTPPayload): Promise<VerifyOTPResponse> => {
    const response = await api.post<VerifyOTPResponse>('/otp/verify', payload);
    return response.data;
  },

  registerX: async (payload: HackXRegisterPayload): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/x/register', payload);
    return response.data;
  },

  registerJr: async (payload: HackXJrRegisterPayload): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/jr/register', payload);
    return response.data;
  },

  verifyAmbassador: async (code: string, category: 'x' | 'jr' = 'x'): Promise<{ status: string; valid: boolean; code: string }> => {
    const response = await api.get<{ status: string; valid: boolean; code: string }>(`/${category}/verify-ambassador/${code}`);
    return response.data;
  },
};

interface APIErrorDetail {
  field: string;
  message: string;
}

interface APIErrorResponse {
  message?: string;
  errors?: APIErrorDetail[];
  detail?: string | Record<string, unknown>;
}

const formatFieldName = (field: string): string => {
  if (field.includes('->')) {
    const parts = field.split('->').map((p) => p.trim());
    if (parts[0] === 'members' && parts.length >= 3) {
      const index = parseInt(parts[1], 10);
      const subfield = parts[2];
      const role = index === 0 ? 'Leader' : `Member ${index + 1}`;
      let fieldLabel = subfield;
      if (subfield === 'name') fieldLabel = 'Name';
      else if (subfield === 'email') fieldLabel = 'Email';
      else if (subfield === 'phone') fieldLabel = 'Phone';
      else if (subfield === 'nic') fieldLabel = 'NIC';
      else if (subfield === 'dob') fieldLabel = 'Date of Birth';
      return `${role} ${fieldLabel}`;
    }
  }

  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const cleanErrorMessage = (message: string): string => {
  const msg = message.toLowerCase();

  if (msg.includes('should have at least 1 character') || msg.includes('value is missing') || msg.includes('field required')) {
    return 'is required';
  }
  if (msg.includes("should match pattern '^(?:\\d{9}[vvxx]|\\d{12})$'")) {
    return 'must be a valid NIC format (e.g., 991234567V or 199912345678)';
  }
  if (msg.includes("should match pattern '^07\\d{8}$'")) {
    return 'must be exactly 10 digits starting with 07';
  }
  if (msg.includes('value is not a valid email address') || msg.includes('must have an @-sign')) {
    return 'must be a valid email address';
  }

  return message;
};

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as APIErrorResponse;
    if (data.message) {
      const activeFieldErrors = data.errors
        ? data.errors.filter((e) => e.field !== 'http_request' && e.field !== 'server_internal' && e.field !== 'rate_limiter')
        : [];
      if (activeFieldErrors.length > 0) {
        const fieldErrors = activeFieldErrors
          .map((e) => {
            const label = formatFieldName(e.field);
            const msg = cleanErrorMessage(e.message);
            return `• ${label}: ${msg}`;
          })
          .join('\n');
        return `${data.message}\n\n${fieldErrors}`;
      }
      return data.message;
    }
    if (data.detail) {
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    }
  }
  return (err as Error).message || 'An unexpected error occurred. Please try again.';
};

export default api;
