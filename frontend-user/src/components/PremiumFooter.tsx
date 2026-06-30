import React from 'react';
import { Link } from 'react-router-dom';
import './PremiumFooter.css';

const PremiumFooter: React.FC = () => {
  return (
    <footer className="ms-footer">
      <div className="ms-footer-layer ms-footer-layer-0">
        <div className="ms-footer-circle-container">
          <div className="ms-footer-circle-spin">
            <img src="/footer circle.png" alt="" className="ms-footer-circle-img" loading="lazy" />
          </div>
        </div>
      </div>

      <div className="ms-footer-pillar ms-footer-pillar-left">
        <img src="/footer-side.webp" alt="" className="ms-footer-pillar-img ms-footer-pillar-img-left" loading="lazy" />
      </div>

      <div className="ms-footer-pillar ms-footer-pillar-right">
        <img src="/footer-side.webp" alt="" className="ms-footer-pillar-img ms-footer-pillar-img-right" loading="lazy" />
      </div>

      <div className="ms-footer-gradient-veil" />

      <div className="ms-footer-center-statue">
        <img src="/footer-center.webp" alt="" className="ms-footer-center-img" loading="lazy" />
        <div className="ms-footer-center-fade" />
      </div>

      <div className="ms-footer-mobile-veil" />

      <div className="ms-footer-content-wrapper">
        <div className="ms-footer-grid">
          <div className="ms-footer-col ms-footer-col-left">
            <Link to="/" className="ms-footer-logo-link">
              <img src="/hackxlogo.webp" alt="hackX Logo" className="ms-footer-logo" loading="lazy" />
            </Link>
            <p className="ms-footer-desc">
              Sri Lanka's premier national startup challenge for undergraduates across all universities.
            </p>
          </div>

          <div className="ms-footer-col ms-footer-col-right">
            <p className="ms-footer-desc">
              Organized by the Industrial Management Science Students’ Association, University of Kelaniya in collaboration with the Ministry of Science & Technology and The National Science Foundation of Sri Lanka.
            </p>
            <div className="ms-footer-organizers-wrapper">
              <img src="/allorganizerslogo.webp" alt="Organizers" className="ms-footer-organizers-logo" loading="lazy" />
            </div>
          </div>
        </div>

        <div className="ms-footer-bottom-bar">
          <p className="ms-footer-copyright">&copy; {new Date().getFullYear()} hackX 11.0.</p>
          <div className="ms-footer-socials">
            <a href="https://www.linkedin.com/company/imssauok/" className="social-glass" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
            </a>
            <a href="https://facebook.com/imhackx" className="social-glass" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
            </a>
            <a href="https://instagram.com/hackx_uok" className="social-glass" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a href="https://youtube.com/@hackX_UoK" className="social-glass" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
            </a>
            <a href="https://tiktok.com" className="social-glass" aria-label="TikTok" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.66a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.06z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PremiumFooter;
