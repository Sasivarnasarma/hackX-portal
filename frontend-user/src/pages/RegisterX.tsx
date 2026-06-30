import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Users, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { useRegistration } from '../context/RegistrationContext';
import { registrationAPI, getErrorMessage } from '../api/registration';
import type { HackXMember } from '../api/registration';
import OceanBackground from '../components/OceanBackground';
import '../components/RegistrationSplit.css';
import { CinematicFooter } from '../components/ui/motion-footer';
import TurnstileCaptcha from '../components/TurnstileCaptcha';

const NIC_PATTERN = /^(?:\d{9}[vVxX]|\d{12})$/;
const PHONE_PATTERN = /^07\d{8}$/;

const X_SOURCE_OPTIONS = [
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Friends', label: 'Friends' },
  { value: 'University/Lecturer', label: 'University/Lecturer' },
  { value: 'Previous Participant', label: 'Previous Participant' },
  { value: 'Other', label: 'Other' }
];

const RegisterX: React.FC = () => {
  const navigate = useNavigate();
  const { xData, updateXData, clearXData, clearJrData } = useRegistration();

  const [currentStage, setCurrentStage] = useState(xData.stage);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };



  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Form Fields Stage 1
  const [leaderName, setLeaderName] = useState(xData.name);
  const [leaderEmail, setLeaderEmail] = useState(xData.email || xData.pendingEmail);
  const [leaderPhone, setLeaderPhone] = useState(xData.phone);
  const [leaderNic, setLeaderNic] = useState(xData.nic);

  const needsCaptcha = !xData.verificationToken || leaderEmail !== xData.email;

  // Stage 2: OTP
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<HTMLInputElement[]>([]);

  // Stage 3: Team Details
  const [teamName, setTeamName] = useState(xData.teamName || '');
  const [university, setUniversity] = useState(xData.university || '');
  const [expectations, setExpectations] = useState(xData.expectations || '');
  const [source, setSource] = useState(xData.source || '');
  const [ambassadorCode, setAmbassadorCode] = useState(xData.ambassadorCode || localStorage.getItem('hackx_ambassador_code') || '');
  const [consentShare, setConsentShare] = useState(xData.consentShare !== undefined ? xData.consentShare : true);
  const [additionalMembers, setAdditionalMembers] = useState<Omit<HackXMember, 'is_leader'>[]>(xData.additionalMembers || []);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);

  useEffect(() => {
    updateXData({ stage: currentStage });
    // Scroll to top when stage changes
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 50);
  }, [currentStage, updateXData]);

  useEffect(() => {
    if (isSubmitted) return;
    updateXData({
      teamName,
      university,
      expectations,
      source,
      ambassadorCode,
      consentShare,
      additionalMembers,
    });
  }, [teamName, university, expectations, source, ambassadorCode, consentShare, additionalMembers, updateXData, isSubmitted]);

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
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to top when registration is successful
  useEffect(() => {
    if (isSubmitted) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
    }
  }, [isSubmitted]);

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
    if (!leaderNic.trim()) {
      errors.nic = 'NIC number is required';
    } else if (!NIC_PATTERN.test(leaderNic)) {
      errors.nic = 'NIC must be 9 digits with V/X or 12 digits';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Stage 1 (Send OTP)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateStage1()) return;



    const emailChanged = leaderEmail.trim().toLowerCase() !== xData.email.trim().toLowerCase();
    const hasVerifiedToken = !!xData.verificationToken;

    if (!emailChanged && hasVerifiedToken) {
      updateXData({
        name: leaderName.trim(),
        phone: leaderPhone.trim(),
        nic: leaderNic.trim().toUpperCase(),
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
          updateXData({ verificationToken: '' });
        }

        const res = await registrationAPI.sendOTP({
          email: leaderEmail.trim().toLowerCase(),
          turnstile_token: turnstileToken || '1x00000000000000000000AA',
          purpose: 'hackx_registration',
        });

        updateXData({
          pendingEmail: leaderEmail.trim().toLowerCase(),
          name: leaderName.trim(),
          phone: leaderPhone.trim(),
          nic: leaderNic.trim().toUpperCase(),
          captchaSessionToken: res.captcha_session_token,
        });

        setResendTimer(60);
        setCurrentStage(2);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // OTP Change handler
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // Allow digits only

    const newOtp = [...otp];
    if (val.length > 1) {
      // Handle paste
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

    // Shift focus to next box
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
      const verifyEmail = xData.pendingEmail || leaderEmail;
      const res = await registrationAPI.verifyOTP({
        email: verifyEmail,
        otp: code,
        captcha_session_token: xData.captchaSessionToken,
        purpose: 'hackx_registration',
      });

      updateXData({
        email: verifyEmail,
        pendingEmail: '',
        verificationToken: res.verification_token,
        captchaSessionToken: '',
      });

      setCurrentStage(3);
    } catch (err: any) {
      console.error('Stage 2 verification error:', err);
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
      const verifyEmail = xData.pendingEmail || leaderEmail;
      await registrationAPI.resendOTP({
        email: verifyEmail,
        captcha_session_token: xData.captchaSessionToken,
        purpose: 'hackx_registration',
      });
      setResendTimer(60);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  // Manage additional members
  const addMemberField = () => {
    if (additionalMembers.length < 4) {
      setAdditionalMembers([...additionalMembers, { name: '', nic: '', phone: '', email: '' }]);
    }
  };

  const removeMemberField = (index: number) => {
    setAdditionalMembers(additionalMembers.filter((_, i) => i !== index));
    // Clear validation errors for that member index
    const prefix = `member-${index}-`;
    const newErrors = { ...validationErrors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(prefix)) delete newErrors[key];
    });
    setValidationErrors(newErrors);
  };

  const updateMemberField = (index: number, field: keyof Omit<HackXMember, 'is_leader'>, val: string) => {
    const updated = [...additionalMembers];
    updated[index] = { ...updated[index], [field]: val };
    setAdditionalMembers(updated);

    // Clear specific field validation error
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
    } else if (field === 'nic') {
      if (!value.trim()) {
        newErrors.nic = 'NIC number is required';
      } else if (!NIC_PATTERN.test(value)) {
        newErrors.nic = 'NIC must be 9 digits with V/X or 12 digits';
      } else {
        delete newErrors.nic;
      }
    } else if (field === 'teamName') {
      if (!value.trim()) {
        newErrors.teamName = 'Team name is required';
      } else {
        delete newErrors.teamName;
      }
    } else if (field === 'university') {
      if (!value.trim()) {
        newErrors.university = 'University name is required';
      } else {
        delete newErrors.university;
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
        if (!value.trim()) {
          newErrors[field] = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
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
      } else if (subfield === 'nic') {
        if (!value.trim()) {
          newErrors[field] = 'NIC is required';
        } else if (!NIC_PATTERN.test(value)) {
          newErrors[field] = 'Must be 9-digit with V/X or 12-digit';
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
    if (!university.trim()) errors.university = 'University name is required';
    if (expectations.trim() && expectations.trim().length > 1000) {
      errors.expectations = 'Expectations must not exceed 1000 characters';
    }

    // Duplicate check lists
    const allNames = [xData.name.toLowerCase()];
    const allEmails = [xData.email.toLowerCase()];
    const allNics = [xData.nic.toUpperCase()];

    // Validate additional members
    additionalMembers.forEach((member, i) => {
      const mPrefix = `member-${i}-`;
      if (!member.name.trim()) errors[`${mPrefix}name`] = 'Name is required';
      else if (allNames.includes(member.name.trim().toLowerCase())) {
        errors[`${mPrefix}name`] = 'Duplicate member name detected';
      } else {
        allNames.push(member.name.trim().toLowerCase());
      }

      if (!member.email.trim()) {
        errors[`${mPrefix}email`] = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(member.email)) {
        errors[`${mPrefix}email`] = 'Invalid email address';
      } else if (allEmails.includes(member.email.trim().toLowerCase())) {
        errors[`${mPrefix}email`] = 'Duplicate email detected';
      } else {
        allEmails.push(member.email.trim().toLowerCase());
      }

      if (!member.phone.trim()) {
        errors[`${mPrefix}phone`] = 'Phone number is required';
      } else if (!PHONE_PATTERN.test(member.phone)) {
        errors[`${mPrefix}phone`] = 'Must start with 07 and be 10 digits';
      }

      if (!member.nic.trim()) {
        errors[`${mPrefix}nic`] = 'NIC is required';
      } else if (!NIC_PATTERN.test(member.nic)) {
        errors[`${mPrefix}nic`] = 'Must be 9-digit with V/X or 12-digit';
      } else if (allNics.includes(member.nic.trim().toUpperCase())) {
        errors[`${mPrefix}nic`] = 'Duplicate NIC detected';
      } else {
        allNics.push(member.nic.trim().toUpperCase());
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
    clearXData();



    setIsLoading(true);
    try {
      if (ambassadorCode.trim()) {
        try {
          const verifyRes = await registrationAPI.verifyAmbassador(ambassadorCode.trim());
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
        } catch (err: any) {
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

      const leader: HackXMember = {
        name: xData.name,
        nic: xData.nic,
        phone: xData.phone,
        email: xData.email,
        is_leader: true,
      };

      const payload = {
        team_name: teamName.trim(),
        university: university.trim(),
        consent_share: consentShare,
        expectations: expectations.trim(),
        source: source.trim(),
        ambassador_code: ambassadorCode.trim() || undefined,
        verification_token: xData.verificationToken,
        members: [
          leader,
          ...additionalMembers.map((m) => ({
            ...m,
            nic: m.nic.trim().toUpperCase(),
            email: m.email.trim().toLowerCase(),
            is_leader: false,
          })),
        ],
      };

      await registrationAPI.registerX(payload);
      setIsSubmitted(true);
      sessionStorage.setItem('success_team_name', payload.team_name);
      sessionStorage.setItem('success_category', 'hackX');
      localStorage.clear();
      sessionStorage.removeItem('hackx_x_registration');
      sessionStorage.removeItem('hackx_jr_registration');
      sessionStorage.removeItem('hackx_ambassador_code');
      clearXData();
      clearJrData();
      navigate('/success');
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Verification token expired
        setError('Your email verification session has expired. Please verify your email again.');
        setCurrentStage(1);
        updateXData({ verificationToken: '' });
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

  // Back actions
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
        <div style={{ width: '100%' }}>
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
              cursor: 'pointer',
              display: 'inline-flex'
            }}
          >
            <ArrowLeft size={16} /> Back to Hub
          </a>

          {/* Registration Container */}
          <div className="ambient-glow-left" />
          <div className="ambient-glow-right" />
          <div className="split-container">
            {/* Left Form Column */}
            <div className="form-column" onMouseMove={handleMouseMove} style={{ "--mouse-x": `${mousePosition.x}px`, "--mouse-y": `${mousePosition.y}px` } as React.CSSProperties}>
              <div className="mouse-spotlight" />
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}>
                  hackX 11.0 Registration
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Inter-University Startup Challenge
                </p>
              </div>

              {/* Progress Stepper */}
              <div className="split-stepper">
                <div className={`split-step ${currentStage >= 1 ? 'active' : ''} ${currentStage > 1 ? 'completed' : ''}`}>
                  <div className="split-step-circle">{currentStage > 1 ? <Check size={14} /> : '1'}</div>
                  <span className="split-step-label">Leader</span>
                </div>
                <div className={`split-step-divider ${currentStage > 1 ? 'active' : ''}`} />
                <div className={`split-step ${currentStage >= 2 ? 'active' : ''} ${currentStage > 2 ? 'completed' : ''}`}>
                  <div className="split-step-circle">{currentStage > 2 ? <Check size={14} /> : '2'}</div>
                  <span className="split-step-label">Verify</span>
                </div>
                <div className={`split-step-divider ${currentStage > 2 ? 'active' : ''}`} />
                <div className={`split-step ${currentStage === 3 ? 'active' : ''}`}>
                  <div className="split-step-circle">3</div>
                  <span className="split-step-label">Team</span>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ff6b6b' }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', textAlign: 'left', whiteSpace: 'pre-line' }}>{error}</span>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {currentStage === 1 && (
                  <motion.form
                  className="form-grid-container"
                  key="stage1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSendOTP}
                >
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <User size={20} color="var(--color-accent)" /> Team Leader Details
                  </h3>

                  <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                    <label className="form-label" htmlFor="leaderName">Full Name</label>
                    <input
                      className="form-input"
                      type="text"
                      id="leaderName"
                      placeholder="Enter full name"
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
                      placeholder="e.g. leader@university.com"
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      onBlur={() => handleBlur('email', leaderEmail)}
                    />
                    {validationErrors.email && <span className="form-error">{validationErrors.email}</span>}
                  </div>
                  </motion.div>

                  <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                    <label className="form-label" htmlFor="leaderNic">NIC Number</label>
                    <input
                      className="form-input"
                      type="text"
                      id="leaderNic"
                      placeholder="e.g. 199912345678 or 991234567V"
                      value={leaderNic}
                      onChange={(e) => setLeaderNic(e.target.value)}
                      maxLength={12}
                      onBlur={() => handleBlur('nic', leaderNic)}
                    />
                    {validationErrors.nic && <span className="form-error">{validationErrors.nic}</span>}
                  </div>
                  </motion.div>

                  {/* Captcha */}
                  {needsCaptcha && <TurnstileCaptcha onVerify={setTurnstileToken} />}

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                    {isLoading ? <span className="spinner" /> : <>Continue to Verification <ArrowRight size={18} /></>}
                  </button>
                </motion.form>
                )}
                {currentStage === 2 && (
                  <motion.form
                  className="form-grid-container"
                  key="stage2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyOTP}
                >
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Verify Your Email
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    A 6-digit OTP code has been sent to <strong style={{ color: 'white' }}>{xData.pendingEmail || leaderEmail}</strong>.
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4rem', fontSize: '0.875rem' }}>
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
                {currentStage === 3 && (
                  <motion.form
                  className="form-grid-container"
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
                        Team Leader (Verified)
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
                      <div><strong>Name</strong> {xData.name}</div>
                      <div><strong>Email</strong> {xData.email}</div>
                      <div><strong>Phone</strong> {xData.phone}</div>
                      <div><strong>NIC</strong> {xData.nic}</div>
                    </div>
                  </div>

                  <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">
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
                      <label className="form-label" htmlFor="university">University / Institute</label>
                      <input
                        className="form-input"
                        type="text"
                        id="university"
                        placeholder="e.g. University of Kelaniya"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        maxLength={100}
                        onBlur={() => handleBlur('university', university)}
                      />
                      {validationErrors.university && <span className="form-error">{validationErrors.university}</span>}
                    </div>
                  </motion.div>

                                    {/* Dynamic Members Section */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
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

                        <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="form-row-2">
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
                              id={`member-${i}-nic`}
                              className="form-input"
                              placeholder="NIC (e.g. 1999xxxx or 99xxxV)"
                              value={member.nic}
                              onChange={(e) => updateMemberField(i, 'nic', e.target.value)}
                              maxLength={12}
                              onBlur={() => handleBlur(`member-${i}-nic`, member.nic)}
                            />
                            {validationErrors[`member-${i}-nic`] && <span className="form-error">{validationErrors[`member-${i}-nic`]}</span>}
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

<div className="form-group">
                    <label className="form-label" htmlFor="expectations">What are your expectations from hackX 11.0? (Optional)</label>
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

                  <div className="form-group" ref={sourceDropdownRef} id="source">
                    <label className="form-label">How did you hear about hackX? (Optional)</label>
                    <div className="custom-select-wrapper">
                      <div
                        className={`custom-select-trigger ${isSourceDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                      >
                        <span>
                          {X_SOURCE_OPTIONS.find((s) => s.value === source)?.label || 'Select Option'}
                        </span>
                        <ChevronDown size={18} style={{ transform: isSourceDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </div>

                      {isSourceDropdownOpen && (
                        <div className="custom-options-list">
                          {X_SOURCE_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className={`custom-option ${source === option.value ? 'selected' : ''}`}
                              onClick={() => {
                                setSource(option.value);
                                setIsSourceDropdownOpen(false);
                              }}
                            >
                              {option.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

                  <div className="form-group checkbox-container" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', cursor: 'pointer' }} onClick={() => setConsentShare(!consentShare)}>
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

            {/* Right Info Column */}
            <div className="info-column">
              <div className="info-logo-container">
                <img src="/Logos/hackx-logo.webp" alt="hackX logo" className="info-logo" />
              </div>
              
              <div className="info-content-wrapper">
                <div className="info-content">
                  <h4 className="info-step-title" style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Registration Guidelines</h4>
                  <ul style={{ 
                    color: 'var(--color-text-muted)', 
                    fontSize: '0.95rem', 
                    lineHeight: '1.6', 
                    paddingLeft: '1.2rem',
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <li>Ensure all required information is available before starting your registration.</li>
                    <li>
                      Provide accurate and up-to-date details for your team, including:
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', listStyleType: 'circle', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>Team Leader’s contact details</li>
                        <li>University or higher education institution</li>
                        <li>Details of all team members</li>
                      </ul>
                    </li>
                    <li>Only one team member, preferably the Team Leader, is required to complete the registration on behalf of the entire team.</li>
                    <li>If you are registering as an individual participant, simply complete and verify the Team Leader Details section. Additional team member details are not required.</li>
                    <li>Double-check all information before submitting, as it will be used for official communication, eligibility verification, and future competition updates.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          </div>
      </main>

      <CinematicFooter showCards={false} />
    </div>
  );
};

export default RegisterX;
