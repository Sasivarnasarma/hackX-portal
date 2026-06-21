import React from 'react';

const PremiumFooter: React.FC = () => {
  return (
    <footer className="premium-footer">
      <div className="footer-content">
        
        <div className="footer-block">
          <img src="/Logos/department logos.webp" alt="Department Logos" className="footer-group-logo" loading="lazy" />
          <div className="footer-text-block">
            <span className="footer-label">Collaboratively organized by the</span><br />
            <strong>Department of Industrial Management</strong>, University of Kelaniya
          </div>
        </div>
          
        <div className="footer-divider"></div>

        <div className="footer-block">
          <div className="footer-logo-row">
            <img src="/Logos/Ministry of Science & Technology.png" alt="Ministry and NSF Logos" className="footer-group-logo" style={{ height: '100px' }} loading="lazy" />
          </div>
          <div className="footer-text-block">
            <span className="footer-label">under the Patronage of the</span><br />
            <strong>Ministry of Science & Technology</strong> and <strong>National Science Foundation Sri Lanka</strong>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default PremiumFooter;
