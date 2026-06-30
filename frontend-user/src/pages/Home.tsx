import React from 'react';
import { CinematicFooter } from '../components/ui/motion-footer';

const Home: React.FC = () => {
  return (
    <div className="relative w-full bg-background min-h-screen font-sans overflow-x-hidden selection:bg-primary/20">
      <CinematicFooter />
    </div>
  );
};

export default Home;
