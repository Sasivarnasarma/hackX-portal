import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Mail, Compass, Bell } from 'lucide-react';
import OceanBackground from '../components/OceanBackground';
import PremiumFooter from '../components/PremiumFooter';

const FacebookIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const YoutubeIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/>
    <polygon points="10 15 15 12 10 9"/>
  </svg>
);

interface SuccessState {
  teamName: string;
  category: 'hackX' | 'hackX Jr';
}

const Success: React.FC = () => {
  const location = useLocation();
  const state = location.state as SuccessState | null;

  const teamName = state?.teamName || sessionStorage.getItem('success_team_name');
  const category = state?.category || sessionStorage.getItem('success_category');

  if (!teamName || !category) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <OceanBackground />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        zIndex: 10,
        position: 'relative'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel"
          style={{
            padding: '3.5rem 2.5rem',
            maxWidth: '540px',
            width: '100%',
            textAlign: 'center',
            boxSizing: 'border-box',
            borderRadius: 'var(--radius-xl)'
          }}
        >

          {/* Ripple checkmark */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
            className="success-ripple"
          >
            <Check size={40} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glow-text"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', margin: '0 0 1rem 0', color: '#ffffff', letterSpacing: '0.04em' }}
          >
            Registration Successful!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem 0' }}
          >
            Congratulations! Team <strong style={{ color: 'var(--color-arc)' }}>{teamName}</strong> has been successfully registered for <strong style={{ color: 'white' }}>{category}</strong>.
          </motion.p>

          {/* Next steps timeline */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              background: 'rgba(1, 8, 20, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              borderRadius: '1.25rem',
              padding: '2rem 1.75rem',
              marginBottom: '2.5rem',
              textAlign: 'left',
              position: 'relative'
            }}
          >
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 1.5rem 0',
              color: 'var(--color-arc)'
            }}>
              Next Steps & Guidelines
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              {/* Vertical line connecting timeline steps */}
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                background: 'linear-gradient(to bottom, var(--color-electric), rgba(91, 184, 255, 0.1))',
                zIndex: 1
              }} />

              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--color-deep-space)',
                  border: '2px solid var(--color-electric)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-arc)',
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(26, 111, 212, 0.3)'
                }}>
                  <Mail size={12} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Email Confirmation</h4>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    An email containing credentials and registration summary has been sent to the team leader.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--color-deep-space)',
                  border: '2px solid var(--color-electric)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-arc)',
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(26, 111, 212, 0.3)'
                }}>
                  <Bell size={12} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Stay Tuned</h4>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Keep an eye on your email for important updates, event schedules, and guidelines.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--color-deep-space)',
                  border: '2px solid var(--color-electric)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-arc)',
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(26, 111, 212, 0.3)'
                }}>
                  <Compass size={12} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Community Networks</h4>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Join our social media to get instant updates:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <a
                      href="https://facebook.com/imhackx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="success-social-link"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--color-arc)',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        background: 'rgba(91, 184, 255, 0.05)',
                        border: '1px solid rgba(91, 184, 255, 0.15)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <FacebookIcon /> Facebook
                    </a>
                    <a
                      href="https://instagram.com/hackx_uok"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="success-social-link"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--color-arc)',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        background: 'rgba(91, 184, 255, 0.05)',
                        border: '1px solid rgba(91, 184, 255, 0.15)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <InstagramIcon /> Instagram
                    </a>
                    <a
                      href="https://youtube.com/@hackX_UoK"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="success-social-link"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--color-arc)',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        background: 'rgba(91, 184, 255, 0.05)',
                        border: '1px solid rgba(91, 184, 255, 0.15)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <YoutubeIcon /> YouTube
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.a
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            href="/"
            className="btn-primary"
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
              position: 'relative',
              zIndex: 50,
              cursor: 'pointer'
            }}
          >
            Return to Hub
          </motion.a>
        </motion.div>
      </main>

      <PremiumFooter />
    </div>
  );
};

export default Success;
