import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OceanBackground from '../components/OceanBackground';
import PremiumFooter from '../components/PremiumFooter';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <OceanBackground />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* Glow Header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', marginBottom: '0.5rem' }}
        >
          <span className="eyebrow-label">Registration Hub</span>
          <h1 className="glow-text" style={{
            fontSize: 'calc(3rem + 3vw)',
            margin: '0 0 0.5rem 0',
            letterSpacing: '0.08em',
            color: '#ffffff',
            lineHeight: 1.1
          }}>
            hackX
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'calc(0.85rem + 0.3vw)',
            fontWeight: 400,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.1em',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            National Hackathon Series
          </p>
        </motion.div>

        {/* Ministry Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
          animate={{ opacity: 0.75, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            margin: '1.5rem 0 2.5rem 0',
            display: 'flex',
            justifyContent: 'center',
            transition: 'opacity 0.3s ease'
          }}
          whileHover={{ opacity: 1 }}
        >
          <img
            src="/Logos/ministry Logo.png"
            alt="Ministry of Science & Technology"
            style={{
              height: '130px',
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'brightness(0.95) contrast(1.05)'
            }}
            loading="lazy"
          />
        </motion.div>

        {/* Selector Cards Container */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '4rem'
        }}>
          {/* hackX 11.0 Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/x')}
            className="hub-card"
          >
            <div className="hub-card-badge">University Tier</div>
            <div className="hub-card-logo-container">
              <img
                src="/Logos/hackx-logo.webp"
                alt="hackX 11.0"
                className="hub-card-logo"
              />
            </div>
            <div>
              <h3 className="hub-card-title">hackX 11.0</h3>
              <p className="hub-card-desc">Sri Lanka's premier university-tier national hackathon series</p>
            </div>
          </motion.div>

          {/* hackX Jr. 9.0 Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/jr')}
            className="hub-card"
          >
            <div className="hub-card-badge">School Tier</div>
            <div className="hub-card-logo-container">
              <img
                src="/Logos/hackxJr-logo.webp"
                alt="hackX Jr. 9.0"
                className="hub-card-logo"
              />
            </div>
            <div>
              <h3 className="hub-card-title">hackX Jr. 9.0</h3>
              <p className="hub-card-desc">The ultimate technology battleground for school-tier innovators</p>
            </div>
          </motion.div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
};

export default Home;
