import React, { useEffect } from 'react';
import { CinematicFooter } from '../components/ui/motion-footer';

const Home: React.FC = () => {
  useEffect(() => {
    document.title = "hackX National Hackathon Series Registration Portal";
  }, []);

  return (
    <div className="relative w-full bg-background min-h-screen font-sans overflow-x-hidden selection:bg-primary/20">
      <CinematicFooter />
    </div>
  );
};

export default Home;
