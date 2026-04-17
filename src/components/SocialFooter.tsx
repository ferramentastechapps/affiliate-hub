"use client";

import { motion } from "framer-motion";
import { InstagramLogo, TiktokLogo } from "@phosphor-icons/react";

export function SocialFooter() {
  return (
    <footer className="w-full border-t border-white/10 bg-zinc-950/50 backdrop-blur-md mt-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Título */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              Siga nossas redes sociais
            </h3>
            <p className="text-zinc-400 text-sm">
              Fique por dentro das melhores ofertas e lançamentos
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a 
              href="https://instagram.com/usejotashop" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg hover:shadow-purple-500/50"
            >
              <InstagramLogo size={24} weight="fill" />
              @usejotashop
            </a>
            <a 
              href="https://tiktok.com/@jota123testando" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-zinc-950 font-semibold hover:scale-105 transition-transform shadow-lg hover:shadow-white/50"
            >
              <TiktokLogo size={24} weight="fill" />
              @jota123testando
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center text-zinc-500 text-sm mt-4">
            <p>© {new Date().getFullYear()} Affiliate Hub. Todos os direitos reservados.</p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
