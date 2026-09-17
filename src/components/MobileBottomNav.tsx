"use client";

import { House, Tag, Ticket, Bell, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const TABS = [
  { id: "inicio",       label: "Início",       Icon: House },
  { id: "categorias",   label: "Categorias",   Icon: Tag },
  { id: "cupons",       label: "Cupons",        Icon: Ticket },
  { id: "notificacoes", label: "Alertas",       Icon: Bell },
] as const;

type TabId = typeof TABS[number]["id"];

export function MobileBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("inicio");
  const pathname = usePathname();

  // Hide on scroll-down, show on scroll-up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY && currentY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const onCats = () => setActiveTab("categorias");
    const onCupons = () => setActiveTab("cupons");
    window.addEventListener("open-categories", onCats);
    window.addEventListener("open-coupons", onCupons);
    return () => {
      window.removeEventListener("open-categories", onCats);
      window.removeEventListener("open-coupons", onCupons);
    };
  }, []);

  const handleTab = (id: TabId) => {
    setActiveTab(id);
    if (id === "inicio") {
      const el = document.getElementById("inicio");
      if (el) window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (id === "categorias") {
      window.dispatchEvent(new CustomEvent("open-categories"));
    }
    if (id === "cupons") {
      window.location.href = "/cupons";
    }
    if (id === "notificacoes") {
      window.dispatchEvent(new CustomEvent("open-notifications"));
    }
  };

  if (pathname?.startsWith("/admin")) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-3 mb-3 h-[58px] flex items-center bg-[#0e1018]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_-2px_24px_rgba(0,0,0,0.6)] overflow-hidden">
            
            {/* 4 Main Tabs */}
            {TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTab(id)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-transform relative"
                  aria-label={label}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[#ff334b]"
                    />
                  )}
                  <Icon
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-[#ff334b]" : "text-[#6b7280]"}
                  />
                  <span
                    className={`text-[10px] font-medium leading-none ${
                      isActive ? "text-[#ff334b]" : "text-[#6b7280]"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-[1px] h-8 bg-white/[0.06] shrink-0" />

            {/* WhatsApp */}
            <a
              href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Grupo WhatsApp"
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-transform"
            >
              <div className="relative">
                <WhatsappLogo size={22} weight="fill" className="text-[#25D366]" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping" />
              </div>
              <span className="text-[10px] font-medium leading-none text-[#6b7280]">Grupo</span>
            </a>

          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
