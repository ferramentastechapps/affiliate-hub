"use client";

import { motion } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState } from "react";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="glass-panel rounded-2xl px-4 py-2 transition-all duration-300">
            <div className="flex items-center justify-between">
              
              {/* Logo */}
              <motion.a
                href="/"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 shrink-0"
              >
                <img
                  src="/logo 2 branco.png"
                  alt="Economiza ai"
                  className="h-12 w-auto block"
                />
              </motion.a>

              {/* Navegação */}
              <nav className="hidden md:flex items-center gap-2">
                <NavLink href="#inicio">Início</NavLink>
                <NavLink href="#categorias">Categorias</NavLink>
                <NavLink href="#cupons">Cupons</NavLink>
                <NavLink href="#ofertas">Ofertas</NavLink>
              </nav>

              {/* Botão de Autenticação */}
              <div className="flex items-center">
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
      className="px-5 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] flex items-center"
    >
      {children}
    </motion.a>
  );
}

