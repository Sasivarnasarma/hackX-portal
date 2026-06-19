import React from 'react';

const PremiumFooter: React.FC = () => {
  return (
    <footer className="premium-footer">
      <div className="footer-content">
        <div className="footer-text-block">
          Collaboratively organized by the<br />
          <strong>Department of Industrial Management</strong>, University of Kelaniya<br />
          under the Patronage of the <strong>Ministry of Science & Technology</strong> and <strong>National Science Foundation Sri Lanka</strong>.
        </div>
        <div className="footer-logos-block">
          <div className="logo-crop-wrapper">
            <img
              src="/allorganizerslogo.webp"
              alt="hackX Organizers"
              loading="lazy"
              className="logo-crop-img"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PremiumFooter;
