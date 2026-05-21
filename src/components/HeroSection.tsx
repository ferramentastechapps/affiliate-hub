"use client";

import { motion, Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { Tag } from "@phosphor-icons/react";
import { BannersCarousel } from "./BannersCarousel";

export function HeroSection() {
  const [hasBanners, setHasBanners] = useState(false);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHasBanners(true);
        }
      })
      .catch(() => {});
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Variantes de animação para Framer Motion
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <section className="relative w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-4 pb-12 overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 right-0 -z-10 w-[80vw] md:w-[50vw] h-[50vh] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-40 animate-pulse duration-[8s]" />
      <div className="absolute top-1/4 left-10 -z-10 w-[40vw] h-[40vh] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none opacity-30" />

      <div className={`grid grid-cols-1 ${hasBanners ? "lg:grid-cols-12" : "max-w-4xl mx-auto text-center items-center"} gap-12 items-center w-full`}>
        
        {/* Coluna de Texto */}
        <motion.div 
          className={`flex flex-col ${hasBanners ? "lg:col-span-7 items-start text-left" : "items-center text-center"} w-full`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Título Principal */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1] sm:leading-none"
          >
            Economize de verdade nas <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent drop-shadow-sm">
              Melhores Lojas
            </span>
          </motion.h1>

          {/* Descrição */}
          <motion.p 
            variants={itemVariants}
            className={`text-zinc-400 text-base md:text-lg mb-8 leading-relaxed ${hasBanners ? "max-w-xl" : "max-w-2xl mx-auto"}`}
          >
            A maior comunidade de achados de promoções e cupons de desconto do Brasil. Copie o cupom, vá para a loja e pague menos na hora.
          </motion.p>

          {/* Botões de Ação */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap gap-4 items-center justify-center lg:justify-start w-full sm:w-auto"
          >
            <button
              onClick={() => scrollToSection("ofertas")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_40px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 text-base cursor-pointer min-h-[48px]"
            >
              <Tag size={20} weight="bold" />
              <span>Ver Ofertas do Dia</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Coluna do Carrossel (Condicional) */}
        {hasBanners && (
          <motion.div 
            className="lg:col-span-5 w-full h-full flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
          >
            <BannersCarousel />
          </motion.div>
        )}

      </div>
    </section>
  );
}
