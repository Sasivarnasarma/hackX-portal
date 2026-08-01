import React, { useEffect } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Compass, ExternalLink } from 'lucide-react';
import OceanBackground from '../components/OceanBackground';
import { CinematicFooter } from '../components/ui/motion-footer';
import '../components/RegistrationSplit.css';

interface ProposalSuccessProps {
  tier: 'x' | 'jr';
}

const ProposalSuccess: React.FC<ProposalSuccessProps> = ({ tier }) => {
  const location = useLocation();
  const state = location.state as any;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Retrieve states
  const teamName = state?.teamName;
  const youtubeUrl = state?.youtubeUrl;
  const submitter = state?.submitter;
  const role = state?.role;

  if (!teamName) {
    return <Navigate to="/" replace />;
  }

  const isJr = tier === 'jr';
  const themeClass = isJr ? 'hackx-jr-theme' : '';
  const tierTitle = isJr ? 'hackX Jr. 9.0' : 'hackX 11.0';

  return (
    <div className={themeClass} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <OceanBackground />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem',
        zIndex: 10,
        position: 'relative',
        justifyContent: 'center'
      }}>
        <div style={{ width: '90%', maxWidth: '800px', marginTop: '2rem' }}>
          
          <div className="ambient-glow-left" />
          <div className="ambient-glow-right" />
          
          <div className="form-column" style={{ padding: '3.5rem 2.5rem', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Animated checkmark circle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  style={{
                    width: '5rem',
                    height: '5rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(91, 184, 255, 0.1)',
                    border: '2px solid var(--color-arc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-arc)',
                    boxShadow: '0 0 30px rgba(91, 184, 255, 0.3)'
                  }}
                >
                  <Check size={40} strokeWidth={3} />
                </motion.div>
              </div>

              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">
                Submission Successful
              </h2>
              <p className="text-sm text-cyan-400 font-bold uppercase tracking-widest mb-6">
                {tierTitle} Proposal Panel
              </p>

              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                {isJr ? (
                  <>Congratulations! The project proposal blueprint for team <strong>{teamName}</strong> has been submitted successfully.</>
                ) : (
                  <>Congratulations! The project proposal blueprint and pitch video showcase links for team <strong>{teamName}</strong> have been submitted successfully.</>
                )}
              </p>

              {/* Roster & Submit Metadata */}
              <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-lg mb-8 text-left text-xs space-y-3.5">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
                  <span className="text-slate-500 uppercase tracking-wider">Team Name</span>
                  <strong className="text-white text-sm">{teamName}</strong>
                </div>
                {submitter && (
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
                    <span className="text-slate-500 uppercase tracking-wider">Submitted By</span>
                    <span className="text-slate-300 font-semibold">{submitter} ({role})</span>
                  </div>
                )}
                {youtubeUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase tracking-wider">Video Showcase</span>
                    <a 
                      href={youtubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: '2px' }}>
                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Watch Video
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-8 leading-normal">
                Confirmation emails have been dispatched to the team members. Organize elements such as your slide decks and mockups, and prepare for the next phase.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary">
                    <Compass size={16} />
                    Back to Hub
                  </button>
                </Link>
              </div>

            </motion.div>
          </div>

        </div>
      </main>

      <div style={{ marginTop: 'auto' }}>
        <CinematicFooter showCards={false} />
      </div>
    </div>
  );
};

export default ProposalSuccess;
