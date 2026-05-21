"use client";

import { motion } from "framer-motion";
import { Fire, Ticket } from "@phosphor-icons/react";

export function HeroSection() {
  const scrollToSection = (id: string, isCoupon = false) => {
    if (isCoupon) {
      window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "CUPOM" } }));
    }
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-4 md:px-8 pt-16 pb-12 overflow-hidden text-center">
      
      {/* Premium Mesh Gradient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[70vw] h-[50vh] bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-[140px] rounded-full pointer-events-none opacity-60" />

      {/* Hero Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-md mb-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span className="text-xs font-semibold text-zinc-400 tracking-wide">
          Ofertas atualizadas em tempo real
        </span>
      </motion.div>

      {/* Hero Title */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6"
      >
        Encontre as Melhores Ofertas e{" "}
        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Cupons
        </span>{" "}
        em um Só Lugar!
      </motion.h1>

      {/* Hero Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-8"
      >
        A maior comunidade de achados de promoções e cupons de desconto do Brasil.
        Copie o cupom, vá para a loja e pague menos na hora de forma 100% gratuita.
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto"
      >
        <button
          onClick={() => scrollToSection("ofertas")}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 cursor-pointer min-h-[52px]"
        >
          <Fire size={20} weight="fill" />
          Ver Ofertas do Dia
        </button>
        
        <button
          onClick={() => scrollToSection("ofertas", true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold transition-all backdrop-blur-md hover:-translate-y-0.5 cursor-pointer min-h-[52px]"
        >
          <Ticket size={20} />
          Explorar Cupons
        </button>
      </motion.div>
    </section>
  );
}
