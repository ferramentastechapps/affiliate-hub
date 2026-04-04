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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium tracking-wide text-zinc-300 uppercase">
            Top Ofertas Diárias
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6 text-white">
          Meus Equipamentos & <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">
            Recomendações
          </span>
        </h1>

        <p className="text-lg text-zinc-400 leading-relaxed max-w-[50ch] mb-10">
          Encontre os melhores produtos que uso e recomendo para setup, streaming e home office. Escolha a sua plataforma favorita e compre com segurança.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <a href="#" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-zinc-950 font-semibold hover:scale-105 transition-transform">
            <InstagramLogo size={20} weight="fill" />
            @seu_perfil
          </a>
          <a href="#" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-all">
            <TiktokLogo size={20} weight="fill" />
            @seu_tiktok
          </a>
        </div>
      </motion.div>

      {/* Right side: Stylized Image/Asset */}
      <motion.div 
        className="w-full md:w-5/12 h-[400px] md:h-[500px] relative rounded-[3rem] overflow-hidden glass-panel flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <img 
          src="https://picsum.photos/seed/setup/800/800" 
          alt="Setup profile"
          className="w-full h-full object-cover opacity-60"
        />
        {/* Floating badge for Taste-skill micro-physics look */}
        <motion.div 
          className="absolute -bottom-6 -left-6 md:bottom-8 md:-left-12 glass-panel p-4 rounded-2xl flex items-center gap-3"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <div className="bg-accent/20 p-2 rounded-full text-accent">
            <Link size={24} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Links Verificados</p>
            <p className="text-xs text-zinc-400">Atualizado hoje</p>
          </div>
        </motion.div>
      </motion.div>

    </section>
  );
}
