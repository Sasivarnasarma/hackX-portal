import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, AlertCircle, FileText, Send, HelpCircle, User, ExternalLink } from 'lucide-react';
import OceanBackground from '../components/OceanBackground';
import TurnstileCaptcha from '../components/TurnstileCaptcha';
import { CinematicFooter } from '../components/ui/motion-footer';
import '../components/RegistrationSplit.css';

interface ProposalProps {
  tier: 'x' | 'jr';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getErrorMessage = (err: any, fallback: string): string => {
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data === 'string' && data.trim()) return data;
  }
  return err.response?.statusText || err.message || fallback;
};

const Proposal: React.FC<ProposalProps> = ({ tier }) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = tier === 'x' ? "hackX 11.0 | Proposal Submission" : "hackX Jr. 9.0 | Proposal Submission";
  }, [tier]);

  const isJr = tier === 'jr';


  // Spotlight Mouse effect
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // State Management
  const [stage, setStage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // HackX Step 1: Email OTP Verification
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [captchaSessionToken, setCaptchaSessionToken] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<HTMLInputElement[]>([]);

  // Auto focus first OTP input on step 2
  useEffect(() => {
    if (stage === 1 && otpSent) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [stage, otpSent]);

  // HackX Step 2: Team Roster
  const [teamDetails, setTeamDetails] = useState<any>(null);

  // HackX Jr Step 1: Leader Search (No email verification)
  const [searchQuery, setSearchQuery] = useState('');
  const [jrTeams, setJrTeams] = useState<any[]>([]);
  const [selectedJrTeam, setSelectedJrTeam] = useState<any>(null);
  const [jrSessionToken, setJrSessionToken] = useState('');

  // Load session from navigation state if coming back from success page
  const location = useLocation();
  useEffect(() => {
    if (location.state) {
      const navState = location.state as any;
      if (isJr && navState.jrSessionToken && navState.selectedJrTeam) {
        setJrSessionToken(navState.jrSessionToken);
        setSelectedJrTeam(navState.selectedJrTeam);
        setStage(3);
      } else if (!isJr && navState.verificationToken && navState.teamDetails) {
        setVerificationToken(navState.verificationToken);
        setTeamDetails(navState.teamDetails);
        setStage(3);
      }
    }
  }, [location.state, isJr]);

  // Custom delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; slotNumber: number } | null>(null);

  // Junior Proposals list state and helper actions
  const [jrProposals, setJrProposals] = useState<any[]>([]);

  useEffect(() => {
    if (selectedJrTeam) {
      setJrProposals(selectedJrTeam.proposals || []);
    } else {
      setJrProposals([]);
    }
  }, [selectedJrTeam]);

  const handleDownloadJrFile = (id: number) => {
    window.open(`${API_BASE_URL}/proposal/download-jr/${id}?jr_session_token=${encodeURIComponent(jrSessionToken)}`, '_blank');
  };

  const handleDeleteJrFile = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE_URL}/proposal/delete-jr/${id}`, {
        params: { jr_session_token: jrSessionToken }
      });
      const updatedProposals = jrProposals.filter(p => p.id !== id);
      setJrProposals(updatedProposals);
      if (selectedJrTeam) {
        setSelectedJrTeam({
          ...selectedJrTeam,
          proposals: updatedProposals
        });
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to delete proposal file.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getNextJrSlot = () => {
    const occupied = new Set(jrProposals.map(p => p.slot_number));
    for (let s = 1; s <= 5; s++) {
      if (!occupied.has(s)) return s;
    }
    return null;
  };

  const nextSlot = getNextJrSlot();

  // Common Submission Inputs
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (otpSent && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpSent, resendTimer]);

  // Handle OTP send
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = email.trim();
    if (!emailVal) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!turnstileToken) {
      setError('Please resolve the CAPTCHA widget before continuing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/otp/send`, {
        email: email.trim().toLowerCase(),
        turnstile_token: turnstileToken,
        purpose: 'hackx_proposal',
      });

      if (response.data.status === 'success') {
        setCaptchaSessionToken(response.data.captcha_session_token);
        setOtpSent(true);
        setResendTimer(60);
        setStage(2);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to dispatch verification code.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Resend
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/otp/resend`, {
        email: email.trim().toLowerCase(),
        captcha_session_token: captchaSessionToken,
        purpose: 'hackx_proposal',
      });

      if (response.data.status === 'success') {
        setResendTimer(60);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to resend verification code.'));
    } finally {
      setIsResending(false);
    }
  };

  // Handle OTP digit entry
  const handleOtpChange = (index: number, value: string) => {
    const val = value.slice(-1); // Only take last character
    if (isNaN(Number(val))) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/otp/verify`, {
        email: email.trim().toLowerCase(),
        otp: code,
        captcha_session_token: captchaSessionToken,
        purpose: 'hackx_proposal',
      });

      if (response.data.status === 'success') {
        setVerificationToken(response.data.verification_token);
        // Fetch team details
        await fetchTeamDetails(response.data.verification_token);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Incorrect or expired verification code.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Team Details for Submitter
  const fetchTeamDetails = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/proposal/verify-session`, {
        params: { token },
      });
      setTeamDetails(response.data);
      setStage(3);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Verification successful, but failed to fetch team structure.'));
    } finally {
      setIsLoading(false);
    }
  };

  // HackX Jr Step 1: Search Leaders
  const handleFindJrTeams = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryVal = searchQuery.trim();
    if (!queryVal) return;

    let processedQuery = queryVal;

    // Validate email or telephone number
    if (queryVal.includes('@') || /[a-zA-Z]/.test(queryVal)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(queryVal)) {
        setError('Please enter a valid email address.');
        return;
      }
      processedQuery = queryVal.toLowerCase();
    } else {
      const cleanPhone = queryVal.replace(/[\s-()]/g, '');
      const phoneRegex = /^07[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setError('Please enter a valid Sri Lankan mobile number starting with 07 (e.g. 0771234567).');
        return;
      }
      processedQuery = cleanPhone;
    }

    if (!turnstileToken) {
      setError('Please resolve the CAPTCHA widget before continuing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/proposal/find-jr-teams`, {
        query: processedQuery,
        turnstile_token: turnstileToken,
      });

      if (response.data.status === 'success') {
        setJrTeams(response.data.teams);
        setJrSessionToken(response.data.jr_session_token);
        if (response.data.teams.length === 1) {
          setSelectedJrTeam(response.data.teams[0]);
        }
        setStage(2);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'No team leaders found matching that query.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File upload changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (isJr) {
        const filesArray = Array.from(e.target.files);
        const nonPdf = filesArray.some(f => !f.name.toLowerCase().endsWith('.pdf'));
        if (nonPdf) {
          setError('Only PDF file submissions are allowed.');
          setSelectedFiles([]);
          return;
        }
        const remaining = 5 - jrProposals.length;
        if (filesArray.length > remaining) {
          setError(`You can only upload up to ${remaining} more proposal(s).`);
          setSelectedFiles([]);
          return;
        }
        if (jrProposals.length > 0 && filesArray.length > 1) {
          setError('You can only upload one proposal at a time.');
          setSelectedFiles([]);
          return;
        }
        setError(null);
        setSelectedFiles(filesArray);
      } else {
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
          setError('Only PDF file submissions are allowed.');
          setSelectedFile(null);
        } else {
          setError(null);
          setSelectedFile(file);
        }
      }
    }
  };

  // Helper function with recursive client-side retries
  const uploadWithRetry = async (
    formData: FormData,
    url: string,
    retriesLeft = 3,
    delayMs = 2000
  ): Promise<any> => {
    try {
      const res = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      return res.data;
    } catch (err: any) {
      if (retriesLeft > 0) {
        console.warn(`Upload failed. Retrying... Attempts remaining: ${retriesLeft}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return uploadWithRetry(formData, url, retriesLeft - 1, delayMs * 1.5);
      } else {
        throw err;
      }
    }
  };

  // Final submission action
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJr && !selectedFile) {
      setError('Please select your proposal PDF file.');
      return;
    }
    if (isJr && selectedFiles.length === 0) {
      setError('Please select at least one proposal PDF file.');
      return;
    }
    if (!isJr && !youtubeUrl.trim()) {
      setError('Please provide your project demonstration YouTube video URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(10);

    const formData = new FormData();
    if (!isJr && selectedFile) {
      formData.append('file', selectedFile);
      formData.append('youtube_url', youtubeUrl.trim());
    } else {
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
    }

    let submissionUrl = '';
    let successState: any = {};

    if (!isJr) {
      formData.append('token', verificationToken);
      submissionUrl = `${API_BASE_URL}/proposal/submit-x`;
      successState = {
        teamName: teamDetails?.team_name,
        youtubeUrl: youtubeUrl,
        submitter: teamDetails?.submitter?.name,
        role: teamDetails?.submitter?.is_leader ? 'Leader' : 'Member',
        verificationToken: verificationToken,
        teamDetails: teamDetails,
      };
    } else {
      formData.append('jr_session_token', jrSessionToken);
      formData.append('team_id', selectedJrTeam?.team_id);
      submissionUrl = `${API_BASE_URL}/proposal/submit-jr`;

      // Pre-calculate which slots are being occupied by this batch of uploads
      const occupied = new Set(jrProposals.map((p) => p.slot_number));
      const occupiedSlots: number[] = [];
      let currentVacant = 1;
      for (let i = 0; i < selectedFiles.length; i++) {
        while (occupied.has(currentVacant) || occupiedSlots.includes(currentVacant)) {
          currentVacant++;
        }
        occupiedSlots.push(currentVacant);
      }

      successState = {
        teamName: selectedJrTeam?.team_name,
        youtubeUrl: '',
        submitter: selectedJrTeam?.leader_name,
        role: 'Leader',
        slotNumbers: occupiedSlots,
        jrSessionToken: jrSessionToken,
        selectedJrTeam: selectedJrTeam,
        isFirstTime: jrProposals.length === 0,
      };
    }

    try {
      const data = await uploadWithRetry(formData, submissionUrl);
      if (data.status === 'success') {
        setUploadProgress(100);
        navigate(isJr ? '/jr/proposal-success' : '/x/proposal-success', { state: successState });
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Upload failed after multiple connection retries. Please check your network and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={isJr ? 'hackx-jr-theme' : ''} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
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

          <div className="ambient-glow-left" />
          <div className="ambient-glow-right" />

          <div className="split-container">

            {/* Left Form Column */}
            <div
              className="form-column"
              onMouseMove={handleMouseMove}
              style={{
                "--mouse-x": `${mousePosition.x}px`,
                "--mouse-y": `${mousePosition.y}px`
              } as React.CSSProperties}
            >
              <div className="mouse-spotlight" />

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: 'var(--color-text-main)' }}>
                  {isJr ? 'hackX Jr. 9.0 Proposal' : 'hackX 11.0 Proposal'}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Proposal Submission Portal
                </p>
              </div>

              {/* Progress Stepper */}
              <div className="split-stepper">
                <div className={`split-step ${stage >= 1 ? 'active' : ''} ${stage > 1 ? 'completed' : ''}`}>
                  <div className="split-step-circle">{stage > 1 ? <Check size={14} /> : '1'}</div>
                  <span className="split-step-label">Identify</span>
                </div>
                <div className={`split-step-divider ${stage > 1 ? 'active' : ''}`} />

                <div className={`split-step ${stage >= 2 ? 'active' : ''} ${stage > 2 ? 'completed' : ''}`}>
                  <div className="split-step-circle">{stage > 2 ? <Check size={14} /> : '2'}</div>
                  <span className="split-step-label">Verify</span>
                </div>
                <div className={`split-step-divider ${stage > 2 ? 'active' : ''}`} />

                <div className={`split-step ${stage >= 3 ? 'active' : ''}`}>
                  <div className="split-step-circle">3</div>
                  <span className="split-step-label">Upload</span>
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

              <div className="form-content-wrapper">
                <AnimatePresence mode="wait">

                  {/* Step 1 Form (HackX Email Input) */}
                  {!isJr && stage === 1 && (
                    <motion.div
                      key="step1-x"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <form onSubmit={handleSendOtp} className="form-grid-container">
                        <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <User size={20} color="var(--color-accent)" /> Email Verification
                        </h3>

                        <div className="form-group">
                          <label className="form-label" htmlFor="emailAddress">Email Address</label>
                          <input
                            className="form-input"
                            type="email"
                            id="emailAddress"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your registered email address"
                            required
                            disabled={isLoading}
                          />
                        </div>

                        <TurnstileCaptcha onVerify={setTurnstileToken} />

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                          {isLoading ? <span className="spinner" /> : <>Send Verification Code <ArrowRight size={18} /></>}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* Step 1 Form (HackX JR Identify) */}
                  {isJr && stage === 1 && (
                    <motion.div
                      key="step1-jr"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <form onSubmit={handleFindJrTeams} className="form-grid-container">
                        <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          Identify Team
                        </h3>

                        <div className="form-group">
                          <label className="form-label" htmlFor="jrQuery">
                            Leader's Email or Phone Number
                          </label>
                          <input
                            className="form-input"
                            type="text"
                            id="jrQuery"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Enter leader's email address or 10-digit mobile number"
                            required
                            disabled={isLoading}
                          />
                        </div>

                        <TurnstileCaptcha onVerify={setTurnstileToken} />

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                          {isLoading ? <span className="spinner" /> : <>Locate Team <ArrowRight size={18} /></>}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* Step 2 Form (HackX OTP Verification) */}
                  {!isJr && stage === 2 && (
                    <motion.div
                      key="step2-x"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <form onSubmit={handleVerifyOtp} className="form-grid-container">
                        <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          Verify Your Email
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                          A 6-digit OTP code has been sent to <strong style={{ color: 'white' }}>{email}</strong>.
                        </p>

                        <div className="otp-inputs">
                          {otp.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { otpRefs.current[idx] = el!; }}
                              className="form-input otp-box"
                              type="text"
                              maxLength={6}
                              value={digit}
                              onChange={e => handleOtpChange(idx, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(idx, e)}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              disabled={isLoading}
                            />
                          ))}
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
                          {isLoading ? <span className="spinner" /> : <>Verify Code <Check size={18} /></>}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4rem', fontSize: '0.875rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => { setStage(1); setOtpSent(false); setError(null); }}
                            style={{ padding: '0.5rem 1rem' }}
                            disabled={isLoading}
                          >
                            Edit Details
                          </button>

                          {resendTimer > 0 ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>Resend OTP in {resendTimer}s</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={handleResendOtp}
                              disabled={isResending}
                              style={{ padding: '0.5rem 1rem' }}
                            >
                              {isResending ? 'Sending...' : 'Resend OTP'}
                            </button>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* Step 2 Form (HackX JR Selection) */}
                  {isJr && stage === 2 && (
                    <motion.div
                      key="step2-jr"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="form-grid-container">
                        <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          Select Team
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                          We found the following teams matching your details. Please select the correct team:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                          {jrTeams.map((team) => (
                            <div
                              key={team.team_id}
                              onClick={() => setSelectedJrTeam(team)}
                              className={`member-card-wrapper ${selectedJrTeam?.team_id === team.team_id ? 'active' : ''}`}
                              style={{
                                cursor: 'pointer',
                                border: selectedJrTeam?.team_id === team.team_id ? '1px solid var(--color-arc)' : '1px solid rgba(255, 255, 255, 0.05)',
                                background: selectedJrTeam?.team_id === team.team_id ? 'rgba(91, 184, 255, 0.1)' : 'var(--glass-bg)'
                              }}
                            >
                              <div className="member-card-header" style={{ marginBottom: '0.5rem' }}>
                                <span className="member-card-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                                  {team.team_name}
                                </span>
                              </div>
                              <div className="member-details-grid">
                                <div><strong>School</strong> {team.school_name}</div>
                                <div><strong>Leader</strong> {team.leader_name}</div>
                                <div><strong>Phone</strong> {team.leader_phone}</div>
                                <div><strong>Email</strong> {team.leader_email || 'N/A'}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => { setJrTeams([]); setSelectedJrTeam(null); setStage(1); setError(null); }}
                            style={{ padding: '0.5rem 1rem' }}
                            disabled={isLoading}
                          >
                            Go Back
                          </button>

                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => selectedJrTeam && setStage(3)}
                            style={{ padding: '0.5rem 1.5rem' }}
                            disabled={!selectedJrTeam || isLoading}
                          >
                            Confirm Selection <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Submission Uploads */}
                  {stage === 3 && (
                    <motion.div
                      key="step-upload"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <form onSubmit={handleSubmitProposal} className="form-grid-container">
                        <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          Proposal Upload
                        </h3>

                        {!isJr && teamDetails && (
                          <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <h4 style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '1.6rem',
                              fontWeight: 900,
                              margin: 0,
                              color: 'var(--color-arc)',
                              textShadow: '0 0 15px rgba(91, 184, 255, 0.25)',
                              letterSpacing: '0.02em'
                            }}>
                              {teamDetails.team_name}
                            </h4>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                              Submitter: {teamDetails.submitter?.name} ({teamDetails.submitter?.is_leader ? 'Leader' : 'Member'})
                            </p>
                          </div>
                        )}

                        {isJr && selectedJrTeam && (
                          <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <h4 style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '1.6rem',
                              fontWeight: 900,
                              margin: 0,
                              color: 'var(--color-arc)',
                              textShadow: '0 0 15px rgba(91, 184, 255, 0.25)',
                              letterSpacing: '0.02em'
                            }}>
                              {selectedJrTeam.team_name}
                            </h4>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                              Leader: {selectedJrTeam.leader_name}
                            </p>
                          </div>
                        )}
                        {!isJr && (teamDetails?.has_submitted || teamDetails?.proposal_link || teamDetails?.youtube_link) && (
                          <div style={{
                            background: 'rgba(255, 193, 7, 0.1)',
                            border: '1px solid #ffc107',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: '#ffc107',
                            textAlign: 'left'
                          }}>
                            <AlertCircle size={20} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem' }}>
                              <strong>Warning:</strong> A prior proposal submission was found for your team. Submitting now will overwrite your team's existing proposal document and YouTube video link.
                            </span>
                          </div>
                        )}

                        {isJr && jrProposals.length > 0 && (
                          <div style={{
                            background: 'rgba(91, 184, 255, 0.08)',
                            border: '1px solid var(--color-arc)',
                            borderRadius: '0.5rem',
                            padding: '1.25rem 1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: 'var(--color-arc)',
                            textAlign: 'left'
                          }}>
                            <AlertCircle size={20} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                              Your team has already submitted <strong>{jrProposals.length} out of 5</strong> proposals. You can upload additional blueprints to fill the vacant slots, or delete existing proposals to free up slots.
                            </span>
                          </div>
                        )}

                        {isJr && jrProposals.length > 0 && (
                          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                            <h4 style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: 'var(--color-arc)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '1rem'
                            }}>
                              Submitted Proposals ({jrProposals.length} / 5)
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {jrProposals.map((prop) => (
                                <div
                                  key={prop.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.75rem 1rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                      Proposal File {prop.slot_number}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                      Submitted at: {prop.created_at}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDownloadJrFile(prop.id)}
                                      disabled={isLoading}
                                    >
                                      Download
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{
                                        padding: '0.35rem 0.75rem',
                                        fontSize: '0.75rem',
                                        background: 'rgba(255, 107, 107, 0.1)',
                                        borderColor: 'rgba(255, 107, 107, 0.25)',
                                        color: '#ff6b6b'
                                      }}
                                      onClick={() => {
                                        setDeleteTarget({ id: prop.id, slotNumber: prop.slot_number });
                                        setShowDeleteModal(true);
                                      }}
                                      disabled={isLoading}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isJr && (
                          <div className="form-group">
                            <label className="form-label" htmlFor="youtubeUrl">
                              YouTube Video Link
                            </label>
                            <input
                              className="form-input"
                              type="url"
                              id="youtubeUrl"
                              value={youtubeUrl}
                              onChange={e => setYoutubeUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              required
                              disabled={isLoading}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'block', textAlign: 'left' }}>
                              Provide the link to your project demonstration video. Ensure it is set to Public or Unlisted.
                            </span>
                          </div>
                        )}

                        {(!isJr || nextSlot !== null) ? (
                          <div className="form-group">
                            <label className="form-label">
                              {isJr ? 'Proposal Document(s) (PDF)' : 'Proposal Document (PDF)'}
                            </label>
                            <div
                              style={{
                                position: 'relative',
                                border: '2px dashed rgba(255, 255, 255, 0.08)',
                                borderRadius: 'var(--radius-md)',
                                padding: '2.5rem 1.5rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'rgba(0, 0, 0, 0.15)',
                                transition: 'var(--transition-fast)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-arc)'; e.currentTarget.style.background = 'rgba(91, 184, 255, 0.02)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)'; }}
                            >
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                required
                                disabled={isLoading}
                                multiple={isJr && jrProposals.length === 0}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={32} style={{ color: 'var(--color-text-muted)' }} />
                                {isJr ? (
                                  selectedFiles.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                                      {selectedFiles.map((file, idx) => (
                                        <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--color-arc)', fontWeight: 600 }}>
                                          📁 {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    jrProposals.length === 0 ? (
                                      <>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Click or drag PDF file here</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Maximum size 50MB per file</span>
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Click or drag PDF file here</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Maximum size 50MB</span>
                                      </>
                                    )
                                  )
                                ) : (
                                  selectedFile ? (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-arc)', fontWeight: 600, marginTop: '0.25rem' }}>
                                      {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                                    </div>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Click or drag PDF file here</span>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Maximum size 50MB</span>
                                    </>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(255, 107, 107, 0.08)',
                            border: '1px solid #ff6b6b',
                            borderRadius: 'var(--radius-md)',
                            padding: '1.5rem',
                            textAlign: 'center',
                            color: '#ff6b6b',
                            fontSize: '0.9rem',
                            marginBottom: '1.5rem'
                          }}>
                            Maximum upload limit of 5 proposals reached. Delete an existing proposal file to unlock this upload slot.
                          </div>
                        )}

                        {uploadProgress > 0 && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                              <span>Uploading to server...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  backgroundColor: 'var(--color-arc)',
                                  height: '100%',
                                  width: `${uploadProgress}%`,
                                  transition: 'width 0.3s ease',
                                  boxShadow: '0 0 8px var(--color-arc)'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setStage(prev => prev - 1)}
                            style={{ padding: '0.5rem 1rem' }}
                            disabled={isLoading}
                          >
                            Go Back
                          </button>

                          {(!isJr || nextSlot !== null) && (
                            <button
                              type="submit"
                              className="btn-primary"
                              style={{ padding: '0.5rem 2rem' }}
                              disabled={isLoading}
                            >
                              {isLoading ? <span className="spinner" /> : (isJr && jrProposals.length > 0) ? <>Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Proposal(s)` : 'Proposal'} <Send size={18} /></> : <>Upload & Submit <Send size={18} /></>}
                            </button>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            {/* Right Info Column */}
            <div className="info-column">
              <div className="info-logo-container">
                <img
                  src={isJr ? "/Logos/hackxJr-logo.webp" : "/Logos/hackx-logo.webp"}
                  alt={isJr ? "hackX Jr. 9.0" : "hackX 11.0"}
                  className="info-logo"
                />
              </div>

              <div className="info-content-wrapper">
                <div className="info-content">
                  <h4 className="info-step-title">Submission Portal</h4>
                  <p className="info-step-desc mb-6">
                    Welcome to the {isJr ? 'hackX Jr. 9.0' : 'hackX 11.0'} Proposal Submission panel.
                    {isJr
                      ? ' Ensure that you upload the complete, finalized project blueprint document in PDF format.'
                      : ' Ensure that you upload the complete, finalized project blueprint document in PDF format along with your YouTube pitch video link.'}
                  </p>

                  {/* Proposal Template Link & Copy Note */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '1.25rem',
                    marginTop: '1.25rem',
                    textAlign: 'left'
                  }}>
                    <h5 style={{
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <FileText size={14} style={{ color: isJr ? '#72E5F8' : 'var(--color-arc)' }} />
                      Official Proposal Template:
                    </h5>

                    <div style={{
                      background: isJr ? 'rgba(114, 229, 248, 0.08)' : 'rgba(91, 184, 255, 0.08)',
                      border: `1px solid ${isJr ? 'rgba(114, 229, 248, 0.25)' : 'rgba(91, 184, 255, 0.25)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 0.85rem',
                      marginBottom: '1rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      lineHeight: '1.45'
                    }}>
                      <strong style={{ color: isJr ? '#72E5F8' : '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                        📌 Important Note:
                      </strong>
                      This proposal template is a view-only Google Doc. Please make a copy to your own Google Account (<strong>File → Make a copy</strong>) to edit your document.
                    </div>

                    <a
                      href={isJr
                        ? "https://docs.google.com/document/d/1PupIW3PEUUnTAcWWw_sNhJtspaC4CsuCR9mio3iQyEw/edit?usp=sharing"
                        : "https://docs.google.com/document/d/1lAkOrC6DwFc6FiG9EHGpP5rwHQRj8G3ouRGJN2j6ISo/edit?usp=sharing"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: '#ffffff',
                        background: isJr
                          ? 'linear-gradient(135deg, #0A5C72 0%, #18A0C0 100%)'
                          : 'linear-gradient(135deg, #1A6FD4 0%, #5BB8FF 100%)',
                        border: `1px solid ${isJr ? 'rgba(114, 229, 248, 0.4)' : 'rgba(255, 255, 255, 0.25)'}`,
                        boxShadow: isJr
                          ? '0 4px 15px rgba(114, 229, 248, 0.2)'
                          : '0 4px 15px rgba(91, 184, 255, 0.2)',
                        transition: 'var(--transition-smooth)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <FileText size={16} />
                      {isJr ? 'hackX Jr. Proposal Template' : 'hackX Proposal Template'}
                      <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                    </a>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                    <h5 style={{ fontSize: '0.75rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <HelpCircle size={14} style={{ color: 'var(--color-arc)' }} />
                      Upload Requirements:
                    </h5>
                    <ul style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingLeft: '1rem', margin: 0 }}>
                      <li style={{ marginBottom: '0.625rem' }}>Blueprint format must be in <strong>PDF format</strong>.</li>
                      <li style={{ marginBottom: '0.625rem' }}>File capacity should not exceed <strong>50 MB</strong>.</li>
                      {!isJr && (
                        <li style={{ marginBottom: '0.625rem' }}>YouTube URLs must be valid and viewable (Public or Unlisted).</li>
                      )}
                      <li style={{ marginBottom: 0 }}>Submissions can be updated/overwritten if submitted again before the deadline.</li>
                    </ul>
                  </div>

                  {isJr && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', marginTop: '1.5rem', textAlign: 'left' }}>
                      <h5 style={{ fontSize: '0.75rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <HelpCircle size={14} style={{ color: 'var(--color-arc)' }} />
                        Need Assistance?
                      </h5>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                        If you can't find your team details or forgot them, please contact:
                      </p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        <div><strong>Harshana:</strong> (+94) 77 208 6681</div>
                        <div><strong>Lawindi:</strong> (+94) 71 543 5636</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <div style={{ marginTop: 'auto' }}>
        <CinematicFooter showCards={false} />
      </div>

      {/* Custom Proposal Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deleteTarget && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(1, 14, 19, 0.8)',
                backdropFilter: 'blur(12px)',
              }}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px',
                backgroundColor: '#05163D',
                border: '1px solid rgba(255, 107, 107, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 107, 107, 0.1)',
                zIndex: 10,
                textAlign: 'center',
              }}
            >
              {/* Glow Effect */}
              <div style={{
                position: 'absolute',
                top: '-10%',
                left: '40%',
                width: '80px',
                height: '80px',
                background: 'rgba(255, 107, 107, 0.3)',
                filter: 'blur(30px)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                color: '#ff6b6b',
                marginBottom: '1.25rem',
                border: '1px solid rgba(255, 107, 107, 0.25)',
              }}>
                <AlertCircle size={28} />
              </div>

              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'white',
                margin: '0 0 0.5rem 0',
              }}>
                Delete Proposal File {deleteTarget.slotNumber}?
              </h3>

              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.5',
                margin: '0 0 2rem 0',
              }}>
                Are you sure you want to delete Proposal File {deleteTarget.slotNumber}? This action is permanent and cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem 1rem' }}
                  onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #e63946 100%)',
                    borderColor: '#ff6b6b',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.25)',
                  }}
                  onClick={async () => {
                    if (deleteTarget) {
                      await handleDeleteJrFile(deleteTarget.id);
                      setShowDeleteModal(false);
                      setDeleteTarget(null);
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="spinner" /> : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Proposal;
