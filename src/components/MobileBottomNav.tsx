"use client";

import { House, Tag, Ticket, Sparkle, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Ocultar no scroll down e exibir no scroll up (Comportamento polido de App)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Se rolou pra baixo mais de 10px e não estamos no topo absoluto, esconde.
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        // Se rolou pra cima, mostra.
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollTo = (id: string) => {
    if (id === "categorias") {
      window.dispatchEvent(new CustomEvent("open-categories"));
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80; // 80px offset pro header
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:hidden flex items-stretch gap-3"
        >
          {/* Pílula Principal (Navegação Branca) */}
          <div className="flex-1 bg-white rounded-[1.75rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 flex items-center justify-between px-1">
            
            <button 
              onClick={() => scrollTo('inicio')} 
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 text-zinc-900 min-h-[56px] py-2"
              aria-label="Ir para início"
            >
              <House size={24} weight="duotone" />
              <span className="text-[11px] font-bold leading-tight">Início</span>
            </button>
            
            <button 
              onClick={() => scrollTo('categorias')} 
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 text-zinc-500 hover:text-zinc-900 transition-colors min-h-[56px] py-2"
              aria-label="Ir para categorias"
            >
              <Tag size={24} weight="duotone" />
              <span className="text-[11px] font-bold leading-tight">Categorias</span>
            </button>

            <button 
              onClick={() => scrollTo('ofertas')} 
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 text-accent min-h-[56px] py-2"
              aria-label="Ir para cupons"
            >
              <Ticket size={24} weight="duotone" />
              <span className="text-[11px] font-bold leading-tight">Cupons</span>
            </button>
            
          </div>

          <a 
            href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t" 
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Entrar no grupo do WhatsApp"
            className="w-[4.5rem] bg-[#25D366] hover:bg-[#20bd5a] rounded-[1.75rem] shadow-[0_8px_30px_rgba(37,211,102,0.4)] flex flex-col items-center justify-center flex-shrink-0 active:scale-95 transition-all min-h-[56px] py-2 border border-white/10"
          >
            <div className="relative">
               <WhatsappLogo size={26} weight="regular" className="text-white" />
               <div className="absolute inset-0 rounded-full animate-ping bg-white/30" />
            </div>
            <span className="text-[11px] font-bold text-white mt-0.5 leading-tight">Grupo</span>
          </a>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
