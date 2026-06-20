"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star, Fire } from "@phosphor-icons/react";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-4 md:px-8 py-16 md:py-24 overflow-visible text-center min-h-[60vh]">
      
      {/* Floating 3D Elements using framer-motion */}
      <motion.div 
        animate={{ y: [-10, 10, -10], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute top-10 left-[5%] md:left-[15%] text-6xl md:text-8xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-0"
      >
        <span role="img" aria-label="deal">🛍️</span>
      </motion.div>

      <motion.div 
        animate={{ y: [10, -15, 10], rotate: [0, -10, 10, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-10 right-[2%] md:right-[10%] text-7xl md:text-9xl filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)] z-0"
      >
        <span role="img" aria-label="fire">🔥</span>
      </motion.div>

      <motion.div 
        animate={{ y: [-15, 15, -15], x: [-5, 5, -5], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 2 }}
        className="absolute top-20 right-[10%] md:right-[20%] text-5xl md:text-7xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] z-0"
      >
        <span role="img" aria-label="money">💸</span>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="z-10 flex flex-col items-center max-w-4xl mt-8 md:mt-0"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-2xl">
          <Star weight="fill" className="text-yellow-400" size={16} />
          <span className="text-xs md:text-sm font-bold text-white/90 uppercase tracking-widest">Ofertas Premium Selecionadas</span>
          <Star weight="fill" className="text-yellow-400" size={16} />
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1] drop-shadow-2xl">
          Economize Com <br />
          <span className="text-gradient-premium text-3d inline-block mt-2">Impacto Real</span>
        </h1>
        
        <p className="text-lg md:text-2xl text-zinc-300 font-medium max-w-2xl mb-10 drop-shadow-lg">
          Descubra os melhores produtos das maiores lojas online. Cupons exclusivos, preços imbatíveis e muita economia.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const el = document.getElementById("ofertas");
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
          }}
          className="btn-3d flex items-center justify-center gap-3 px-8 py-4 md:px-12 md:py-5 rounded-[20px] text-lg md:text-xl font-black"
        >
          <Fire weight="bold" size={24} />
          <span>Ver Ofertas de Hoje</span>
          <ArrowRight weight="bold" size={20} />
        </motion.button>
      </motion.div>

    </section>
  );
}
