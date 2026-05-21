"use client";

import { motion } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState, useEffect } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    // Dispatch search event to filter daily deals in real-time
    window.dispatchEvent(new CustomEvent("search-change", { detail: { query: val } }));
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo e Nome */}
            <motion.a
              href="/"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 shrink-0"
            >
              <img
                src="/icons/icon-192x192.png"
                alt="Economiza ai Logo Icon"
                className="h-9 w-9 p-0.5 object-contain"
              />
              <img
                src="/logo 2 branco.png"
                alt="Economiza ai"
                className="h-6 w-auto block"
              />
            </motion.a>

            {/* Barra de Busca Centralizada */}
            <div className="relative w-full max-w-md hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Buscar um produto..."
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-full px-5 py-2.5 pl-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <MagnifyingGlass 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" 
                size={18} 
              />
            </div>

            {/* Navegação e AuthButton */}
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink href="#inicio">Início</NavLink>
                <NavLink href="#categorias">Categorias</NavLink>
                <NavLink href="#cupons">Cupons</NavLink>
                <NavLink href="#comunidade">Comunidade</NavLink>
              </nav>

              {/* Auth Button */}
              <div className="shrink-0">
                <AuthButton onOpenAuth={() => setIsAuthOpen(true)} />
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Auth Panel */}
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
      // Clear filters and focus/set search query to coupon or scroll to deals
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
      className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors min-h-[40px] flex items-center"
    >
      {children}
    </motion.a>
  );
}
