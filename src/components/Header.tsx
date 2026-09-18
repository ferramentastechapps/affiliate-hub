"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AuthButton } from "./AuthButton";
import { AuthPanel } from "./AuthPanel";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlass, X, Heart } from "@phosphor-icons/react";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";
import { usePathname } from "next/navigation";

const SEARCH_SUGGESTIONS = ["iPhone", "Notebook", "Fone de ouvido", "Cadeira gamer", "Smartwatch"] as const;

const NAV_LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#categorias", label: "Categorias" },
  { href: "/cupons", label: "Cupons" },
  { href: "/wishlist", label: "Favoritos" },
] as const;

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    window.dispatchEvent(new CustomEvent("search-change", { detail: { query: val } }));
  };

  const openSearch = () => {
    setSearchOpen(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchOpen(false);
    handleSearchChange("");
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOpenNotifs = () => setIsPrefsOpen(true);
    window.addEventListener("open-notifications", handleOpenNotifs);
    return () => window.removeEventListener("open-notifications", handleOpenNotifs);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close search on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSearch(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  return (
    <>
      <MobileSearchOverlay
        isOpen={searchOpen}
        searchVal={searchVal}
        inputRef={inputRef}
        onSearchChange={handleSearchChange}
        onClose={closeSearch}
      />

      {/* ── HEADER ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
          scrolled
            ? "bg-[#080910]/90 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <a href="/" className="flex items-center shrink-0">
            <img
              src="/logo economizei.webp?v=2"
              alt="Economizei"
              className="h-9 md:h-10 w-auto object-contain"
            />
          </a>

          {/* ── DESKTOP: Search bar ── */}
          <form
            onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement)?.blur(); }}
            className="hidden md:block relative w-full max-w-[480px]"
          >
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none"
            />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 bg-[#13151f] border border-white/[0.08] hover:border-white/[0.14] focus:border-[rgba(255,51,75,0.4)] focus:shadow-[0_0_0_3px_rgba(255,51,75,0.08)] rounded-xl pl-9 pr-4 text-[14px] text-white placeholder-[#6b7280] outline-none transition-all duration-150 appearance-none"
              placeholder="Buscar produto..."
            />
          </form>

          {/* ── DESKTOP: Nav links ── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <DesktopNavLink key={href} href={href}>{label}</DesktopNavLink>
            ))}
          </nav>

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile: search icon */}
            <button
              onClick={openSearch}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#6b7280] hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Buscar"
            >
              <MagnifyingGlass size={19} weight="bold" />
            </button>

            {/* Mobile: wishlist */}
            <a
              href="/wishlist"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-rose-400 hover:bg-white/[0.06] transition-colors"
              aria-label="Favoritos"
            >
              <Heart size={19} weight="fill" />
            </a>

            <AuthButton onOpenAuth={() => setIsAuthOpen(true)} />
          </div>

        </div>
      </header>

      <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <NotificationPreferencesModal isOpen={isPrefsOpen} onClose={() => setIsPrefsOpen(false)} mode="edit" />
    </>
  );
}

function DesktopNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href === "/cupons" || href === "/wishlist") {
      window.location.href = href;
      return;
    }
    e.preventDefault();
    if (href === "#categorias") {
      window.dispatchEvent(new CustomEvent("open-categories"));
      return;
    }
    const el = document.getElementById(href.replace("#", ""));
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="px-3 py-1.5 rounded-lg text-[13.5px] font-medium text-[#6b7280] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
    >
      {children}
    </a>
  );
}

interface MobileSearchOverlayProps {
  isOpen: boolean;
  searchVal: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (val: string) => void;
  onClose: () => void;
}

function MobileSearchOverlay({
  isOpen,
  searchVal,
  inputRef,
  onSearchChange,
  onClose,
}: MobileSearchOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-[#080910]/95 backdrop-blur-xl flex flex-col md:hidden"
        >
          {/* Search Bar Row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={17}
                weight="bold"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none"
              />
              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={searchVal}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (document.activeElement as HTMLElement)?.blur();
                  }
                }}
                className="w-full h-10 bg-[#13151f] border border-white/[0.08] rounded-xl pl-9 pr-4 text-[15px] text-white placeholder-[#6b7280] outline-none focus:border-[rgba(255,51,75,0.4)] appearance-none"
                placeholder="Buscar produto..."
              />
            </div>
            <button
              onClick={onClose}
              className="text-[#6b7280] hover:text-white transition-colors text-sm font-medium shrink-0"
            >
              Cancelar
            </button>
          </div>

          {/* Recent / hint */}
          {!searchVal && (
            <div className="px-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#374151] mb-3">Sugestões</p>
              {SEARCH_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSearchChange(s)}
                  className="flex items-center gap-3 w-full py-2.5 text-[15px] text-[#6b7280] hover:text-white transition-colors text-left"
                >
                  <MagnifyingGlass size={15} className="shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

