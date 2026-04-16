"use client";

import { motion } from "framer-motion";
import { Link, MapPin, InstagramLogo, TiktokLogo } from "@phosphor-icons/react";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto min-h-[60vh] flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-20 gap-12 overflow-hidden">
      
      {/* Mesh Gradient Background / Taste-Skill premium touch */}
      <div className="absolute top-0 right-0 -z-10 w-[80vw] md:w-[50vw] h-[50vh] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Left side: Content (Asymmetrical Layout) */}
      <motion.div 
        className="flex flex-col items-start w-full md:w-1/2 z-10"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >


        <div className="flex flex-wrap items-center gap-4">
          <a href="https://instagram.com/usejotashop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-zinc-950 font-semibold hover:scale-105 transition-transform">
            <InstagramLogo size={20} weight="fill" />
            @usejotashop
          </a>
          <a href="https://tiktok.com/@jota123testando" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-all">
            <TiktokLogo size={20} weight="fill" />
            @jota123testando
          </a>
        </div>
      </motion.div>



    </section>
  );
}
