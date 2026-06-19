"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    window.dispatchEvent(new CustomEvent("search-change", { detail: { query: val } }));
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-glass-bg/80 backdrop-blur-xl border-b border-glass-border">
        <div className="max-w-[1400px] mx-auto px-3 md:px-8 py-2.5 md:py-3.5">

          {/* ── MOBILE LAYOUT ── */}
          <div className="flex md:hidden items-center justify-between gap-2">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo economizei.webp" alt="Economizei" className="h-7 w-auto object-contain" />
            </a>

            {/* Busca expandida no mobile */}
            <AnimatePresence>
              {mobileSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "100%" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 relative"
                >
                  <input
                    autoFocus
                    type="text"
                    value={searchVal}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-white/8 border border-white/10 focus:border-accent/50 rounded-xl py-2 pl-3 pr-9 text-white text-sm placeholder-text-secondary outline-none"
                    placeholder="Buscar produto..."
                  />
                  <button
                    onClick={() => { setMobileSearchOpen(false); handleSearchChange(""); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ações direitas */}
            <div className="flex items-center gap-1 shrink-0">
              {!mobileSearchOpen && (
                <button
                  onClick={() => setMobileSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-text-secondary hover:text-white transition-colors"
                  aria-label="Buscar"
                >
                  <MagnifyingGlass size={18} weight="bold" />
                </button>
              )}
              <AuthButton onOpenAuth={() => setIsAuthOpen(true)} />
            </div>
          </div>

          {/* ── DESKTOP LAYOUT ── */}
          <div className="hidden md:flex flex-row items-center justify-between gap-6">

            {/* Logo */}
            <motion.a
              href="/"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-3 shrink-0"
            >
              <img src="/logo economizei.webp" alt="Economizei" className="h-9 w-auto object-contain" />
            </motion.a>

            {/* Barra de Busca */}
            <div className="relative w-full max-w-[500px]">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-white/5 border border-border-custom hover:border-white/10 focus:border-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(255,51,75,0.1)] rounded-xl py-2 pl-4 pr-11 text-white text-sm placeholder-text-secondary outline-none transition-all duration-200"
                placeholder="Buscar um produto..."
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            </div>

            {/* Nav + Auth */}
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-1">
                <NavLink href="#inicio" active>Início</NavLink>
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

      <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (href === "#categorias") { window.dispatchEvent(new CustomEvent("open-categories")); return; }
    if (href === "#cupons") {
      window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "CUPOM" } }));
      const el = document.getElementById("ofertas");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(href.replace("#", ""));
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[40px] flex items-center cursor-pointer ${
        active
          ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-text-secondary hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </motion.a>
  );
}
