'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (!isStandalone) return;

    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (!hasPlayed) {
      setShow(true);
      sessionStorage.setItem('splashPlayed', 'true');
      
      // Fallback: fecha o splash após 10 segundos caso o vídeo falhe ou não termine
      timeoutRef.current = setTimeout(() => {
        setShow(false);
      }, 10000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
        >
          <video
            autoPlay
            muted
            playsInline
            onEnded={handleClose}
            onError={handleClose}
            onClick={handleClose}
            className="w-full h-full object-cover sm:object-contain"
          >
            {/* MOV / QuickTime: Safari e iOS (arquivo principal) */}
            <source src="/abertura.MOV" type="video/quicktime" />
            {/* MP4: fallback para Android, Chrome, Firefox */}
            <source src="/abertura.mp4" type="video/mp4" />
          </video>
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 text-white/50 hover:text-white text-sm font-medium transition-colors z-10"
          >
            Pular
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
