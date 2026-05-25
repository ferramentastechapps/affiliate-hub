"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-4 md:px-8 pt-12 pb-6 overflow-hidden text-center">
      
      {/* Hero Title */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.2] mb-5"
      >
        Encontre as Melhores Ofertas e Cupons em um Só Lugar!
      </motion.h1>

      {/* Hero Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed mb-6 font-medium"
      >
        Receba ofertas exclusivas, cupons e participe da nossa comunidade para não perder nenhuma promoção 😜
      </motion.p>

    </section>
  );
}

