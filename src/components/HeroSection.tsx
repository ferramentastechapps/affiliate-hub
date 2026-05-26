"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-4 md:px-8 pt-4 pb-2 overflow-hidden text-center">
      
      {/* Hero Title */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-xl sm:text-2xl md:text-2xl font-black tracking-tight text-white max-w-3xl leading-tight mb-1 whitespace-nowrap"
      >
        Encontre as Melhores Ofertas e Cupons em um Só Lugar!
      </motion.h1>

      {/* Hero Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-text-secondary text-xs max-w-xl leading-relaxed mb-2 font-medium"
      >
        Ofertas exclusivas, cupons e comunidade para não perder nenhuma promoção 😜
      </motion.p>

    </section>
  );
}

