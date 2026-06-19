import React from 'react';
import DottedSurface from './DottedSurface';

const BUBBLES = Array.from({ length: 25 }).map((_, i) => {
  const size = ((i * 7 + 13) % 4) + 1.5;
  const left = (i * 23) % 100;
  const duration = ((i * 11 + 7) % 12) + 10;
  const delay = (i * 17) % 10;
  return {
    id: i,
    style: {
      width: `${size}px`,
      height: `${size}px`,
      left: `${left}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    },
  };
});

const OceanBackground: React.FC = () => {

  return (
    <>
      {/* Three.js dotted wave surface */}
      <DottedSurface />

      {/* Ambient gradient blobs */}
      <div className="ocean-ambient">
        <div className="ambient-light-1" />
        <div className="ambient-light-2" />
      </div>

      {/* Floating micro-particles */}
      <div className="bubbles-container">
        {BUBBLES.map((bubble) => (
          <div key={bubble.id} className="bubble" style={bubble.style} />
        ))}
      </div>
    </>
  );
};

export default OceanBackground;
