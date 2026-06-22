'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verifica se está rodando como um aplicativo instalado (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    // Se não for aplicativo, não mostra nada
    if (!isStandalone) return;

    // Verificar se já rodou nesta sessão
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (!hasPlayed) {
      setShow(true);
      sessionStorage.setItem('splashPlayed', 'true');
    }
  }, []);

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
            src="/Video de entrada.mov"
            autoPlay
            muted
            playsInline
            onEnded={() => setShow(false)}
            // Caso o onEnded falhe por algum motivo, um click na tela também fecha
            onClick={() => setShow(false)}
            className="w-full h-full object-cover sm:object-contain"
          />
          {/* Botão de pular por garantia, caso a pessoa queira fechar antes */}
          <button 
            onClick={() => setShow(false)}
            className="absolute top-6 right-6 text-white/50 hover:text-white text-sm font-medium transition-colors z-10"
          >
            Pular
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
