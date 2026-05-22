"use client";

import { motion } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState } from "react";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    window.dispatchEvent(new CustomEvent("search-change", { detail: { query: val } }));
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-glass-bg/70 backdrop-blur-xl border-b border-glass-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            
            {/* Logo */}
            <motion.a
              href="/"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 text-decoration-none shrink-0"
            >
              <div className="bg-accent text-white font-extrabold text-xl w-9 h-9 flex items-center justify-center rounded-lg shadow-[0_4px_12px_rgba(255,51,75,0.3)]">
                E
              </div>
              <span className="text-white font-black text-xl tracking-tight leading-none lowercase">
                economizai
              </span>
            </motion.a>

            {/* Barra de Busca no meio */}
            <div className="relative w-full max-w-[500px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input
                type="text"
                value={searchVal}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-white/5 border border-border-custom hover:border-white/10 focus:border-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(255,51,75,0.1)] rounded-xl py-2 pl-11 pr-4 text-white text-sm placeholder-text-secondary outline-none transition-all duration-200"
                placeholder="Buscar um produto..."
              />
            </div>

            {/* Navegação + AuthButton no lado direito */}
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-1">
                <NavLink href="#inicio">Início</NavLink>
                <NavLink href="#categorias">Categorias</NavLink>
                <NavLink href="#cupons">Cupons</NavLink>
                <NavLink href="#footer">Comunidade</NavLink>
              </nav>

              <div className="flex items-center shrink-0">
                <AuthButton onOpenAuth={() => setIsAuthOpen(true)} />
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Painel de Autenticação */}
      <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (href === "#categorias") {
      window.dispatchEvent(new CustomEvent("open-categories"));
      return;
    }
    if (href === "#cupons") {
      window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "CUPOM" } }));
      const el = document.getElementById("ofertas");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return;
    }
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="px-4 py-2 rounded-xl text-sm font-bold text-text-secondary hover:text-white hover:bg-white/5 transition-colors min-h-[40px] flex items-center cursor-pointer"
    >
      {children}
    </motion.a>
  );
}
