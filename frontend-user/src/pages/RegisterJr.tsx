import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Key, Users, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { useRegistration } from '../context/RegistrationContext';
import { registrationAPI, getErrorMessage } from '../api/registration';
import type { HackXJrMember } from '../api/registration';
import OceanBackground from '../components/OceanBackground';
import PremiumFooter from '../components/PremiumFooter';
import TurnstileCaptcha from '../components/TurnstileCaptcha';

const PHONE_PATTERN = /^07\d{8}$/;

const DISTRICTS_LIST = [
  { value: 'colombo', label: 'Colombo' },
  { value: 'gampaha', label: 'Gampaha' },
  { value: 'kalutara', label: 'Kalutara' },
  { value: 'kandy', label: 'Kandy' },
  { value: 'matale', label: 'Matale' },
  { value: 'nuwara eliya', label: 'Nuwara Eliya' },
  { value: 'galle', label: 'Galle' },
  { value: 'matara', label: 'Matara' },
  { value: 'hambantota', label: 'Hambantota' },
  { value: 'jaffna', label: 'Jaffna' },
  { value: 'kilinochchi', label: 'Kilinochchi' },
  { value: 'mannar', label: 'Mannar' },
  { value: 'vavuniya', label: 'Vavuniya' },
  { value: 'mullaitivu', label: 'Mullaitivu' },
  { value: 'batticaloa', label: 'Batticaloa' },
  { value: 'ampara', label: 'Ampara' },
  { value: 'trincomalee', label: 'Trincomalee' },
  { value: 'kurunegala', label: 'Kurunegala' },
  { value: 'puttalam', label: 'Puttalam' },
  { value: 'anuradhapura', label: 'Anuradhapura' },
  { value: 'polonnaruwa', label: 'Polonnaruwa' },
  { value: 'badulla', label: 'Badulla' },
  { value: 'moneragala', label: 'Moneragala' },
  { value: 'ratnapura', label: 'Ratnapura' },
  { value: 'kegalle', label: 'Kegalle' }
];

const RegisterJr: React.FC = () => {
  const navigate = useNavigate();
  const { jrData, updateJrData, clearJrData, clearXData } = useRegistration();

  const [currentStage, setCurrentStage] = useState(jrData.stage);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Form Fields Stage 1
  const [leaderName, setLeaderName] = useState(jrData.name);
  const [leaderEmail, setLeaderEmail] = useState(jrData.email || jrData.pendingEmail);
  const [leaderPhone, setLeaderPhone] = useState(jrData.phone);
  const [leaderDob, setLeaderDob] = useState(jrData.dob);

  const needsCaptcha = !jrData.verificationToken || leaderEmail !== jrData.email;

  // Stage 2: OTP
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<HTMLInputElement[]>([]);

  // Stage 3: Team Details
  const [teamName, setTeamName] = useState(jrData.teamName || '');
  const [schoolName, setSchoolName] = useState(jrData.schoolName || '');
  const [schoolDistrict, setSchoolDistrict] = useState(jrData.schoolDistrict || '');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);

  const [teacherName, setTeacherName] = useState(jrData.teacherName || '');
  const [teacherPhone, setTeacherPhone] = useState(jrData.teacherPhone || '');
  const [teacherEmail, setTeacherEmail] = useState(jrData.teacherEmail || '');

  const [expectations, setExpectations] = useState(jrData.expectations || '');
  const [source, setSource] = useState(jrData.source || '');
  const [ambassadorCode, setAmbassadorCode] = useState(jrData.ambassadorCode || localStorage.getItem('hackx_ambassador_code') || '');
  const [consentShare, setConsentShare] = useState(jrData.consentShare !== undefined ? jrData.consentShare : true);
  const [additionalMembers, setAdditionalMembers] = useState<Omit<HackXJrMember, 'is_leader'>[]>(jrData.additionalMembers || []);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateJrData({ stage: currentStage });
  }, [currentStage, updateJrData]);

  // Sync Stage 3 fields to context/localStorage when they change
  useEffect(() => {
    if (isSubmitted) return;
    updateJrData({
      teamName,
      schoolName,
      schoolDistrict,
      teacherName,
      teacherPhone,
      teacherEmail,
      expectations,
      source,
      ambassadorCode,
      consentShare,
      additionalMembers,
    });
  }, [
    teamName,
    schoolName,
    schoolDistrict,
    teacherName,
    teacherPhone,
    teacherEmail,
    expectations,
    source,
    ambassadorCode,
    consentShare,
    additionalMembers,
    updateJrData,
    isSubmitted,
  ]);

  // Resend OTP countdown
  useEffect(() => {
    if (currentStage === 2 && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStage, resendTimer]);

  // Auto focus first OTP input on step 2
  useEffect(() => {
    if (currentStage === 2) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [currentStage]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target as Node)) {
        setIsDistrictDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle stage 1 validation
  const validateStage1 = () => {
    const errors: Record<string, string> = {};
    if (!leaderName.trim()) errors.name = 'Name is required';
    if (!leaderEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(leaderEmail)) {
      errors.email = 'Invalid email address';
    }
    if (!leaderPhone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!PHONE_PATTERN.test(leaderPhone)) {
      errors.phone = 'Phone number must be exactly 10 digits starting with 07';
    }
    if (!leaderDob.trim()) {
      errors.dob = 'Date of birth is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Stage 1 (Send OTP)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateStage1()) return;

    const emailChanged = leaderEmail.trim().toLowerCase() !== jrData.email.trim().toLowerCase();
    const hasVerifiedToken = !!jrData.verificationToken;

    if (!emailChanged && hasVerifiedToken) {
      updateJrData({
        name: leaderName.trim(),
        phone: leaderPhone.trim(),
        dob: leaderDob.trim(),
      });
      setCurrentStage(3);
    } else {
      if (needsCaptcha && !turnstileToken) {
        setError('Please complete the CAPTCHA verification');
        return;
      }

      setIsLoading(true);
      try {
        if (emailChanged) {
          updateJrData({ verificationToken: '' });
        }

        const res = await registrationAPI.sendOTP({
          email: leaderEmail.trim().toLowerCase(),
          turnstile_token: turnstileToken || '1x00000000000000000000AA',
          purpose: 'hackx_jr_registration',
        });

        updateJrData({
          pendingEmail: leaderEmail.trim().toLowerCase(),
          name: leaderName.trim(),
          phone: leaderPhone.trim(),
          dob: leaderDob.trim(),
          captchaSessionToken: res.captcha_session_token,
        });

        setResendTimer(60);
        setCurrentStage(2);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // OTP Change handler
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    if (val.length > 1) {
      const pasted = val.slice(0, 6).split('');
      pasted.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pasted.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Submit Stage 2 (Verify OTP)
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP code');
      return;
    }

    setIsLoading(true);
    try {
      const verifyEmail = jrData.pendingEmail || leaderEmail;
      const res = await registrationAPI.verifyOTP({
        email: verifyEmail,
        otp: code,
        captcha_session_token: jrData.captchaSessionToken,
        purpose: 'hackx_jr_registration',
      });

      updateJrData({
        email: verifyEmail,
        pendingEmail: '',
        verificationToken: res.verification_token,
        captchaSessionToken: '',
      });

      setCurrentStage(3);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0 || isResending) return;
    setError(null);
    setIsResending(true);

    try {
      const verifyEmail = jrData.pendingEmail || leaderEmail;
      await registrationAPI.resendOTP({
        email: verifyEmail,
        captcha_session_token: jrData.captchaSessionToken,
        purpose: 'hackx_jr_registration',
      });
      setResendTimer(60);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  // Manage additional members
  const addMemberField = () => {
    if (additionalMembers.length < 4) {
      setAdditionalMembers([...additionalMembers, { name: '', dob: '', phone: '', email: '' }]);
    }
  };

  const removeMemberField = (index: number) => {
    setAdditionalMembers(additionalMembers.filter((_, i) => i !== index));
    const prefix = `member-${index}-`;
    const newErrors = { ...validationErrors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(prefix)) delete newErrors[key];
    });
    setValidationErrors(newErrors);
  };

  const updateMemberField = (index: number, field: keyof Omit<HackXJrMember, 'is_leader'>, val: string) => {
    const updated = [...additionalMembers];
    updated[index] = { ...updated[index], [field]: val };
    setAdditionalMembers(updated);

    const errKey = `member-${index}-${field}`;
    if (validationErrors[errKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errKey];
      setValidationErrors(newErrors);
    }
  };

  const handleBlur = (field: string, value: string) => {
    const newErrors = { ...validationErrors };

    if (field === 'name') {
      if (!value.trim()) {
        newErrors.name = 'Name is required';
      } else {
        delete newErrors.name;
      }
    } else if (field === 'email') {
      if (!value.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        newErrors.email = 'Invalid email address';
      } else {
        delete newErrors.email;
      }
    } else if (field === 'phone') {
      if (!value.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!PHONE_PATTERN.test(value)) {
        newErrors.phone = 'Phone number must be exactly 10 digits starting with 07';
      } else {
        delete newErrors.phone;
      }
    } else if (field === 'dob') {
      if (!value.trim()) {
        newErrors.dob = 'Date of birth is required';
      } else {
        delete newErrors.dob;
      }
    } else if (field === 'teamName') {
      if (!value.trim()) {
        newErrors.teamName = 'Team name is required';
      } else {
        delete newErrors.teamName;
      }
    } else if (field === 'schoolName') {
      if (!value.trim()) {
        newErrors.schoolName = 'School name is required';
      } else {
        delete newErrors.schoolName;
      }
    } else if (field === 'schoolDistrict') {
      if (!value.trim()) {
        newErrors.schoolDistrict = 'School district is required';
      } else {
        delete newErrors.schoolDistrict;
      }
    } else if (field === 'teacherName') {
      delete newErrors.teacherName;
    } else if (field === 'teacherPhone') {
      if (value.trim() && !PHONE_PATTERN.test(value)) {
        newErrors.teacherPhone = 'Teacher phone number must be 10 digits starting with 07';
      } else {
        delete newErrors.teacherPhone;
      }
    } else if (field === 'teacherEmail') {
      if (value.trim() && !/\S+@\S+\.\S+/.test(value)) {
        newErrors.teacherEmail = 'Invalid email address';
      } else {
        delete newErrors.teacherEmail;
      }
    } else if (field === 'expectations') {
      if (value.trim() && value.trim().length > 1000) {
        newErrors.expectations = 'Expectations must not exceed 1000 characters';
      } else {
        delete newErrors.expectations;
      }
    } else if (field === 'source') {
      delete newErrors.source;
    } else if (field.startsWith('member-')) {
      const parts = field.split('-');
      const subfield = parts[2];

      if (subfield === 'name') {
        if (!value.trim()) {
          newErrors[field] = 'Name is required';
        } else {
          delete newErrors[field];
        }
      } else if (subfield === 'email') {
        if (value.trim() && !/\S+@\S+\.\S+/.test(value)) {
          newErrors[field] = 'Invalid email address';
        } else {
          delete newErrors[field];
        }
      } else if (subfield === 'phone') {
        if (!value.trim()) {
          newErrors[field] = 'Phone number is required';
        } else if (!PHONE_PATTERN.test(value)) {
          newErrors[field] = 'Must start with 07 and be 10 digits';
        } else {
          delete newErrors[field];
        }
      } else if (subfield === 'dob') {
        if (!value.trim()) {
          newErrors[field] = 'Date of birth is required';
        } else {
          delete newErrors[field];
        }
      }
    }

    setValidationErrors(newErrors);
  };

  // Stage 3 Validation
  const validateStage3 = () => {
    const errors: Record<string, string> = {};
    if (!teamName.trim()) errors.teamName = 'Team name is required';
    if (!schoolName.trim()) errors.schoolName = 'School name is required';
    if (!schoolDistrict.trim()) errors.schoolDistrict = 'School district is required';

    if (teacherPhone.trim() && !PHONE_PATTERN.test(teacherPhone)) {
      errors.teacherPhone = 'Teacher phone number must be 10 digits starting with 07';
    }
    if (teacherEmail.trim() && !/\S+@\S+\.\S+/.test(teacherEmail)) {
      errors.teacherEmail = 'Invalid email address';
    }

    if (expectations.trim() && expectations.trim().length > 1000) {
      errors.expectations = 'Expectations must not exceed 1000 characters';
    }

    const allNames = [jrData.name.toLowerCase()];
    const allEmails = [jrData.email.toLowerCase()];

    // Validate additional members
    additionalMembers.forEach((member, i) => {
      const mPrefix = `member-${i}-`;
      if (!member.name.trim()) errors[`${mPrefix}name`] = 'Name is required';
      else if (allNames.includes(member.name.trim().toLowerCase())) {
        errors[`${mPrefix}name`] = 'Duplicate member name detected';
      } else {
        allNames.push(member.name.trim().toLowerCase());
      }

      if (member.email.trim()) {
        if (!/\S+@\S+\.\S+/.test(member.email)) {
          errors[`${mPrefix}email`] = 'Invalid email address';
        } else if (allEmails.includes(member.email.trim().toLowerCase())) {
          errors[`${mPrefix}email`] = 'Duplicate email detected';
        } else {
          allEmails.push(member.email.trim().toLowerCase());
        }
      }

      if (!member.phone.trim()) {
        errors[`${mPrefix}phone`] = 'Phone number is required';
      } else if (!PHONE_PATTERN.test(member.phone)) {
        errors[`${mPrefix}phone`] = 'Must start with 07 and be 10 digits';
      }

      if (!member.dob.trim()) {
        errors[`${mPrefix}dob`] = 'Date of birth is required';
      }
    });

    setValidationErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    }

    return errorKeys.length === 0;
  };

  // Final Registration Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateStage3()) return;

    setIsLoading(true);
    try {
      if (ambassadorCode.trim()) {
        try {
          const verifyRes = await registrationAPI.verifyAmbassador(ambassadorCode.trim(), 'jr');
          if (!verifyRes.valid) {
            setError('Invalid Ambassador Code. Please check or clear the code.');
            setIsLoading(false);
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }, 100);
            return;
          }
        } catch (err) {
          setError(getErrorMessage(err));
          setIsLoading(false);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
          }, 100);
          return;
        }
      }

      const leader: HackXJrMember = {
        name: jrData.name,
        dob: jrData.dob,
        phone: jrData.phone,
        email: jrData.email,
        is_leader: true,
      };

      const payload = {
        team_name: teamName.trim(),
        school_name: schoolName.trim(),
        school_district: schoolDistrict.trim().toLowerCase(),
        teacher_name: teacherName.trim(),
        teacher_phone: teacherPhone.trim(),
        teacher_email: teacherEmail.trim().toLowerCase(),
        consent_share: consentShare,
        expectations: expectations.trim(),
        source: source.trim(),
        ambassador_code: ambassadorCode.trim() || undefined,
        verification_token: jrData.verificationToken,
        members: [
          leader,
          ...additionalMembers.map((m) => ({
            ...m,
            email: m.email.trim().toLowerCase(),
            is_leader: false,
          })),
        ],
      };

      await registrationAPI.registerJr(payload);
      setIsSubmitted(true);
      sessionStorage.setItem('success_team_name', payload.team_name);
      sessionStorage.setItem('success_category', 'hackX Jr');
      localStorage.clear();
      sessionStorage.removeItem('hackx_x_registration');
      sessionStorage.removeItem('hackx_jr_registration');
      sessionStorage.removeItem('hackx_ambassador_code');
      clearJrData();
      clearXData();
      navigate('/success');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Your email verification session has expired. Please verify your email again.');
        setCurrentStage(1);
        updateJrData({ verificationToken: '' });
      } else {
        setError(getErrorMessage(err));
      }
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToStage1 = () => {
    setError(null);
    setCurrentStage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <OceanBackground />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem',
        zIndex: 10,
        position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: '640px' }}>
          {/* Back button */}
          <a
            href="/"
            className="btn-secondary"
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 50,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Back to Hub
          </a>

          {/* Registration Container */}
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', position: 'relative', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img src="/Logos/hackxJr-logo.webp" alt="hackX Jr logo" style={{ height: '35px', width: 'auto', marginBottom: '0.5rem' }} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}>
                hackX Jr. 9.0 Registration
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                School Tier National Hackathon Series
              </p>
            </div>

            {/* Stepper */}
            <div className="progress-stepper">
              <div className={`step-item ${currentStage >= 1 ? 'active' : ''} ${currentStage > 1 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStage > 1 ? <Check size={16} /> : '1'}
                </div>
                <span className="step-label">Leader</span>
              </div>
              <div className={`step-divider ${currentStage > 1 ? 'active' : ''}`} />
              <div className={`step-item ${currentStage >= 2 ? 'active' : ''} ${currentStage > 2 ? 'completed' : ''}`}>
                <div className="step-circle">
                  {currentStage > 2 ? <Check size={16} /> : '2'}
                </div>
                <span className="step-label">Verify</span>
              </div>
              <div className={`step-divider ${currentStage > 2 ? 'active' : ''}`} />
              <div className={`step-item ${currentStage >= 3 ? 'active' : ''}`}>
                <div className="step-circle">3</div>
                <span className="step-label">Team</span>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(255, 107, 107, 0.1)',
                  border: '1px solid #ff6b6b',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#ff6b6b'
                }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', textAlign: 'left', whiteSpace: 'pre-line' }}>{error}</span>
              </motion.div>
            )}

            {/* Stage Layout Wrapper */}
            <AnimatePresence mode="wait">
              {/* STAGE 1: LEADER DETAILS */}
              {currentStage === 1 && (
                <motion.form
                  key="stage1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSendOTP}
                >
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <User size={20} color="var(--color-accent)" /> Student Leader Details
                  </h3>

                  <div className="form-group">
                    <label className="form-label" htmlFor="leaderName">Full Name</label>
                    <input
                      className="form-input"
                      type="text"
                      id="leaderName"
                      placeholder="Enter student leader name"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value.replace(/[0-9]/g, ''))}
                      maxLength={100}
                      onBlur={() => handleBlur('name', leaderName)}
                    />
                    {validationErrors.name && <span className="form-error">{validationErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="leaderEmail">Email Address</label>
                    <input
                      className="form-input"
                      type="email"
                      id="leaderEmail"
                      placeholder="e.g. student@school.com"
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      onBlur={() => handleBlur('email', leaderEmail)}
                    />
                    {validationErrors.email && <span className="form-error">{validationErrors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="leaderPhone">Phone Number</label>
                    <input
                      className="form-input"
                      type="tel"
                      id="leaderPhone"
                      placeholder="e.g. 0771234567"
                      value={leaderPhone}
                      onChange={(e) => setLeaderPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      onBlur={() => handleBlur('phone', leaderPhone)}
                    />
                    {validationErrors.phone && <span className="form-error">{validationErrors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="leaderDob">Date of Birth</label>
                    <input
                      className="form-input"
                      type="date"
                      id="leaderDob"
                      value={leaderDob}
                      onChange={(e) => setLeaderDob(e.target.value)}
                      onBlur={() => handleBlur('dob', leaderDob)}
                    />
                    {validationErrors.dob && <span className="form-error">{validationErrors.dob}</span>}
                  </div>

                  {/* Captcha */}
                  {needsCaptcha && <TurnstileCaptcha onVerify={setTurnstileToken} />}

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                    {isLoading ? <span className="spinner" /> : <>Continue to Verification <ArrowRight size={18} /></>}
                  </button>
                </motion.form>
              )}

              {/* STAGE 2: OTP VERIFICATION */}
              {currentStage === 2 && (
                <motion.form
                  key="stage2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyOTP}
                >
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Key size={20} color="var(--color-accent)" /> Verify Your Email
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    A 6-digit OTP code has been sent to <strong style={{ color: 'white' }}>{jrData.pendingEmail || leaderEmail}</strong>.
                  </p>

                  <div className="otp-inputs">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el!; }}
                        className="form-input otp-box"
                        type="text"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                    {isLoading ? <span className="spinner" /> : <>Verify Code <Check size={18} /></>}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                    <button type="button" className="btn-secondary" onClick={handleBackToStage1} style={{ padding: '0.5rem 1rem' }}>
                      Edit Details
                    </button>

                    {resendTimer > 0 ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>Resend OTP in {resendTimer}s</span>
                    ) : (
                      <button type="button" className="btn-secondary" onClick={handleResendOTP} disabled={isResending} style={{ padding: '0.5rem 1rem' }}>
                        {isResending ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                </motion.form>
              )}

              {/* STAGE 3: TEAM & MEMBER DETAILS */}
              {currentStage === 3 && (
                <motion.form
                  key="stage3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleFinalSubmit}
                >
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--color-accent)" /> Team Registration
                  </h3>

                  {/* Leader Card Lock */}
                  <div className="member-card-wrapper">
                    <div className="member-card-header" style={{ marginBottom: '0.75rem' }}>
                      <span className="member-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-arc)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-arc)', boxShadow: '0 0 8px var(--color-arc)' }} />
                        Student Leader (Verified)
                      </span>
                      <button
                        type="button"
                        className="member-card-remove"
                        style={{ color: 'var(--color-arc)', background: 'rgba(91, 184, 255, 0.1)', border: '1px solid rgba(91, 184, 255, 0.25)', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                        onClick={() => setCurrentStage(1)}
                        title="Edit Details"
                      >
                        Edit Details
                      </button>
                    </div>
                    <div className="member-details-grid">
                      <div><strong>Name</strong> {jrData.name}</div>
                      <div><strong>Email</strong> {jrData.email}</div>
                      <div><strong>Phone</strong> {jrData.phone}</div>
                      <div><strong>DOB</strong> {jrData.dob}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="teamName">Team Name</label>
                    <input
                      className="form-input"
                      type="text"
                      id="teamName"
                      placeholder="Enter team name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={50}
                      onBlur={() => handleBlur('teamName', teamName)}
                    />
                    {validationErrors.teamName && <span className="form-error">{validationErrors.teamName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="schoolName">School Name</label>
                    <input
                      className="form-input"
                      type="text"
                      id="schoolName"
                      placeholder="e.g. Royal College"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      maxLength={100}
                      onBlur={() => handleBlur('schoolName', schoolName)}
                    />
                    {validationErrors.schoolName && <span className="form-error">{validationErrors.schoolName}</span>}
                  </div>

                  {/* School District Dropdown */}
                  <div className="form-group" ref={districtDropdownRef} id="schoolDistrict">
                    <label className="form-label">School District</label>
                    <div className="custom-select-wrapper">
                      <div
                        className={`custom-select-trigger ${isDistrictDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDistrictDropdownOpen(!isDistrictDropdownOpen)}
                      >
                        <span>
                          {DISTRICTS_LIST.find((d) => d.value === schoolDistrict)?.label || 'Select District'}
                        </span>
                        <ChevronDown size={18} style={{ transform: isDistrictDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </div>

                      {isDistrictDropdownOpen && (
                        <div className="custom-options-list">
                          {DISTRICTS_LIST.map((district) => (
                            <div
                              key={district.value}
                              className={`custom-option ${schoolDistrict === district.value ? 'selected' : ''}`}
                              onClick={() => {
                                setSchoolDistrict(district.value);
                                setIsDistrictDropdownOpen(false);
                                if (validationErrors.schoolDistrict) {
                                  const newErrors = { ...validationErrors };
                                  delete newErrors.schoolDistrict;
                                  setValidationErrors(newErrors);
                                }
                              }}
                            >
                              {district.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {validationErrors.schoolDistrict && <span className="form-error">{validationErrors.schoolDistrict}</span>}
                  </div>

                  {/* Teacher Details */}
                  <div style={{ marginTop: '2rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-arc)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Teacher In-Charge Details
                    </h4>

                    <div className="form-group">
                      <label className="form-label" htmlFor="teacherName">Teacher Name</label>
                      <input
                        className="form-input"
                        type="text"
                        id="teacherName"
                        placeholder="Enter teacher's name"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value.replace(/[0-9]/g, ''))}
                        maxLength={100}
                        onBlur={() => handleBlur('teacherName', teacherName)}
                      />
                      {validationErrors.teacherName && <span className="form-error">{validationErrors.teacherName}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="teacherPhone">Teacher Phone</label>
                        <input
                          className="form-input"
                          type="tel"
                          id="teacherPhone"
                          placeholder="e.g. 0771234567"
                          value={teacherPhone}
                          onChange={(e) => setTeacherPhone(e.target.value.replace(/\D/g, ''))}
                          maxLength={10}
                          onBlur={() => handleBlur('teacherPhone', teacherPhone)}
                        />
                        {validationErrors.teacherPhone && <span className="form-error">{validationErrors.teacherPhone}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="teacherEmail">Teacher Email</label>
                        <input
                          className="form-input"
                          type="email"
                          id="teacherEmail"
                          placeholder="e.g. teacher@school.com"
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          onBlur={() => handleBlur('teacherEmail', teacherEmail)}
                        />
                        {validationErrors.teacherEmail && <span className="form-error">{validationErrors.teacherEmail}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expectations">What are your expectations from hackX Jr. 9.0? (Optional)</label>
                    <textarea
                      className="form-input"
                      id="expectations"
                      placeholder="Describe your expectations..."
                      value={expectations}
                      onChange={(e) => setExpectations(e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical' }}
                      onBlur={() => handleBlur('expectations', expectations)}
                    />
                    {validationErrors.expectations && <span className="form-error">{validationErrors.expectations}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="source">How did you hear about hackX Jr? (Optional)</label>
                    <input
                      className="form-input"
                      type="text"
                      id="source"
                      placeholder="e.g. School, Friends, Social Media"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      maxLength={100}
                      onBlur={() => handleBlur('source', source)}
                    />
                    {validationErrors.source && <span className="form-error">{validationErrors.source}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="ambassadorCode">Ambassador Code (Optional)</label>
                    <input
                      className="form-input"
                      type="text"
                      id="ambassadorCode"
                      placeholder="Enter referral code if applicable"
                      value={ambassadorCode}
                      onChange={(e) => setAmbassadorCode(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  {/* Dynamic Members Section */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                        Additional Members ({additionalMembers.length + 1} / 5)
                      </h4>
                      {additionalMembers.length < 4 && (
                        <button type="button" className="btn-secondary" onClick={addMemberField} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                          + Add Member
                        </button>
                      )}
                    </div>

                    {additionalMembers.map((member, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="member-card-wrapper"
                      >
                        <div className="member-card-header" style={{ marginBottom: '1rem' }}>
                          <span className="member-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-arc)' }}>
                            <span style={{ background: 'rgba(91, 184, 255, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem' }}>#{i + 2}</span>
                            Team Member
                          </span>
                          <button
                            type="button"
                            className="member-card-remove"
                            onClick={() => removeMemberField(i)}
                            style={{
                              background: 'rgba(255, 107, 122, 0.1)',
                              border: '1px solid rgba(255, 107, 122, 0.25)',
                              color: '#ff6b7a',
                              borderRadius: '100px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="form-row">
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <input
                              id={`member-${i}-name`}
                              className="form-input"
                              placeholder="Name"
                              value={member.name}
                              onChange={(e) => updateMemberField(i, 'name', e.target.value.replace(/[0-9]/g, ''))}
                              onBlur={() => handleBlur(`member-${i}-name`, member.name)}
                            />
                            {validationErrors[`member-${i}-name`] && <span className="form-error">{validationErrors[`member-${i}-name`]}</span>}
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <input
                              id={`member-${i}-email`}
                              className="form-input"
                              placeholder="Email"
                              type="email"
                              value={member.email}
                              onChange={(e) => updateMemberField(i, 'email', e.target.value)}
                              onBlur={() => handleBlur(`member-${i}-email`, member.email)}
                            />
                            {validationErrors[`member-${i}-email`] && <span className="form-error">{validationErrors[`member-${i}-email`]}</span>}
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <input
                              id={`member-${i}-phone`}
                              className="form-input"
                              placeholder="Phone Number (e.g. 0771234567)"
                              type="tel"
                              value={member.phone}
                              onChange={(e) => updateMemberField(i, 'phone', e.target.value.replace(/\D/g, ''))}
                              maxLength={10}
                              onBlur={() => handleBlur(`member-${i}-phone`, member.phone)}
                            />
                            {validationErrors[`member-${i}-phone`] && <span className="form-error">{validationErrors[`member-${i}-phone`]}</span>}
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <input
                              id={`member-${i}-dob`}
                              className="form-input"
                              placeholder="Date of Birth"
                              type="date"
                              value={member.dob}
                              onChange={(e) => updateMemberField(i, 'dob', e.target.value)}
                              onBlur={() => handleBlur(`member-${i}-dob`, member.dob)}
                            />
                            {validationErrors[`member-${i}-dob`] && <span className="form-error">{validationErrors[`member-${i}-dob`]}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="consentShare"
                      checked={consentShare}
                      onChange={(e) => setConsentShare(e.target.checked)}
                      style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem' }}
                    />
                    <label htmlFor="consentShare" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                      I agree to share the submitted details with potential sponsors and organizers.
                    </label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={isLoading}>
                    {isLoading ? <span className="spinner" /> : <>Complete Registration <Check size={18} /></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
};

export default RegisterJr;
