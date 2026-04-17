"use client";

import { motion } from "framer-motion";
import { InstagramLogo, TiktokLogo } from "@phosphor-icons/react";
import { BannersCarousel } from "./BannersCarousel";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center px-4 md:px-8 py-12 gap-8 overflow-hidden">
      
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 right-0 -z-10 w-[80vw] md:w-[50vw] h-[50vh] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Social Links */}
      <motion.div 
        className="flex flex-wrap items-center justify-center gap-4 w-full z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <a href="https://instagram.com/usejotashop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-zinc-950 font-semibold hover:scale-105 transition-transform">
          <InstagramLogo size={20} weight="fill" />
          @usejotashop
        </a>
        <a href="https://tiktok.com/@jota123testando" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-all">
          <TiktokLogo size={20} weight="fill" />
          @jota123testando
        </a>
      </motion.div>

      {/* Banners Carousel */}
      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
      >
        <BannersCarousel />
      </motion.div>

    </section>
  );
}
