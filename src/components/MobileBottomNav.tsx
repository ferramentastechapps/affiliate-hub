"use client";

import { House, Tag, Ticket, Bell, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<'inicio' | 'categorias' | 'cupons' | 'notificacoes'>('inicio');

  // Ocultar no scroll down e exibir no scroll up (Comportamento polido de App)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Escutar eventos de outras partes do app para atualizar a aba ativa
  useEffect(() => {
    const handleSetInicio = () => setActiveTab('inicio');
    const handleSetCategorias = () => setActiveTab('categorias');
    const handleSetCupons = () => setActiveTab('cupons');
    
    window.addEventListener("open-categories", handleSetCategorias);
    window.addEventListener("open-coupons", handleSetCupons);
    
    return () => {
      window.removeEventListener("open-categories", handleSetCategorias);
      window.removeEventListener("open-coupons", handleSetCupons);
    };
  }, []);

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

  const handleTabClick = (tab: 'inicio' | 'categorias' | 'cupons' | 'notificacoes') => {
    setActiveTab(tab);
    if (tab === 'inicio') scrollTo('inicio');
    if (tab === 'categorias') scrollTo('categorias');
    if (tab === 'cupons') {
      window.dispatchEvent(new CustomEvent("open-coupons"));
    }
    if (tab === 'notificacoes') {
      window.dispatchEvent(new CustomEvent("open-notifications"));
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed bottom-5 left-0 right-0 mx-auto z-50 md:hidden w-[92%] max-w-sm flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl rounded-full border border-white/10 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          {/* Início */}
          <button 
            onClick={() => handleTabClick('inicio')} 
            className={`flex flex-col items-center justify-center flex-1 active:scale-90 transition-all min-h-[48px] rounded-full ${
              activeTab === 'inicio' 
                ? 'text-orange-500 bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5' 
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
            aria-label="Ir para início"
          >
            <House size={22} weight={activeTab === 'inicio' ? "fill" : "duotone"} />
          </button>
          
          {/* Categorias */}
          <button 
            onClick={() => handleTabClick('categorias')} 
            className={`flex flex-col items-center justify-center flex-1 active:scale-90 transition-all min-h-[48px] rounded-full ${
              activeTab === 'categorias' 
                ? 'text-orange-500 bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5' 
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
            aria-label="Ir para categorias"
          >
            <Tag size={22} weight={activeTab === 'categorias' ? "fill" : "duotone"} />
          </button>

          {/* Cupons */}
          <button 
            onClick={() => handleTabClick('cupons')} 
            className={`flex flex-col items-center justify-center flex-1 active:scale-90 transition-all min-h-[48px] rounded-full ${
              activeTab === 'cupons' 
                ? 'text-orange-500 bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5' 
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
            aria-label="Ir para cupons"
          >
            <Ticket size={22} weight={activeTab === 'cupons' ? "fill" : "duotone"} />
          </button>

          {/* Alertas / Notificações */}
          <button 
            onClick={() => handleTabClick('notificacoes')} 
            className={`flex flex-col items-center justify-center flex-1 active:scale-90 transition-all min-h-[48px] rounded-full ${
              activeTab === 'notificacoes' 
                ? 'text-orange-500 bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5' 
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
            aria-label="Abrir preferências de notificações"
          >
            <Bell size={22} weight={activeTab === 'notificacoes' ? "fill" : "duotone"} />
          </button>
          
          {/* WhatsApp */}
          <a 
            href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t" 
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Entrar no grupo do WhatsApp"
            className="flex flex-col items-center justify-center flex-1 active:scale-90 transition-all min-h-[48px] rounded-full border border-transparent hover:bg-white/5 text-zinc-400 hover:text-[#25D366]"
          >
            <div className="relative flex items-center justify-center">
              <WhatsappLogo size={22} weight="duotone" className="text-[#25D366] drop-shadow-[0_0_6px_rgba(37,211,102,0.3)]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
            </div>
          </a>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
