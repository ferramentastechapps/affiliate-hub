"use client";

import { motion } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState, useEffect } from "react";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled ? "py-3" : "py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={`glass-panel rounded-[2rem] px-6 transition-all duration-300 ${
              isScrolled ? "py-3" : "py-4"
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Logo */}
              <motion.a
                href="/"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-3"
              >
                <img
                  src="/logo2.png"
                  alt="Logo"
                  className="h-16 sm:h-20 w-auto"
                />
              </motion.a>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="#inicio">Início</NavLink>
                <NavLink href="#categorias">Categorias</NavLink>
                <NavLink href="#cupons">Cupons</NavLink>
                <NavLink href="#ofertas">Ofertas</NavLink>
              </nav>

              {/* Auth Button */}
              <AuthButton onOpenAuth={() => setIsAuthOpen(true)} />
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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </motion.a>
  );
}
