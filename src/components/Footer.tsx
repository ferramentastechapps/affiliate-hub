"use client";

import { motion } from "framer-motion";
import { WhatsappLogo, TelegramLogo, InstagramLogo, VideoCamera, Heart } from "@phosphor-icons/react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: WhatsappLogo,
      url: "https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_tTelegram",
      color: "lg:hover:bg-green-500/20 lg:hover:text-green-400 lg:hover:border-green-500/50",
      bgColor: "bg-green-500/10",
      mobileColor: "bg-green-500/20 text-green-400 border-green-500/50",
      description: "Grupo WhatsApp",
    },
    {
      name: "Telegram",
      icon: TelegramLogo,
      url: "https://t.me/+OFDVybtJcc40YmZh",
      color: "lg:hover:bg-blue-500/20 lg:hover:text-blue-400 lg:hover:border-blue-500/50",
      bgColor: "bg-blue-500/10",
      mobileColor: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      description: "Canal Telegram",
    },
    {
      name: "Instagram",
      icon: InstagramLogo,
      url: "https://www.instagram.com/jota123testando?igsh=MTBuY3dueWQ4N3c3Mw%3D%3D&utm_source=qr",
      color: "lg:hover:bg-pink-500/20 lg:hover:text-pink-400 lg:hover:border-pink-500/50",
      bgColor: "bg-pink-500/10",
      mobileColor: "bg-pink-500/20 text-pink-400 border-pink-500/50",
      description: "Siga no Instagram",
    },
    {
      name: "TikTok",
      icon: VideoCamera,
      url: "https://www.tiktok.com/@jota123testando?_r=1&_t=ZS-95lRBdrstLW",
      color: "lg:hover:bg-purple-500/20 lg:hover:text-purple-400 lg:hover:border-purple-500/50",
      bgColor: "bg-purple-500/10",
      mobileColor: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      description: "Siga no TikTok",
    },
  ];

  return (
    <footer className="w-full bg-zinc-950/50 backdrop-blur-xl border-t border-zinc-800/50 mt-20 pb-20 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        {/* Seção de Comunidade */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Junte-se à nossa comunidade! 🎉
            </h3>
            <p className="text-zinc-400 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              Receba ofertas exclusivas, cupons em primeira mão e participe de discussões sobre as melhores promoções
            </p>
          </motion.div>

          {/* Botões de Redes Sociais - Todos iguais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-5xl mx-auto">
            {socialLinks.map((social, index) => (
              <motion.a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`group flex items-center gap-3 px-6 py-4 rounded-2xl border bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 ${social.mobileColor} ${social.color}`}
              >
                <div className={`p-3 rounded-xl ${social.bgColor} transition-colors`}>
                  <social.icon size={24} weight="fill" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">
                    {social.description}
                  </div>
                  <div className="text-xs opacity-80">
                    Clique para seguir
                  </div>
                </div>
                <div className="opacity-80 transition-opacity group-hover:opacity-100">
                  →
                </div>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo e Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center md:items-start gap-3"
          >
            <div className="flex items-center gap-3">
              <img
                src="/logo2.png"
                alt="123 Testando"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-zinc-500 text-sm flex items-center gap-1.5">
              © {currentYear} 123 Testando. Feito com <Heart size={14} weight="fill" className="text-red-500" /> para você economizar
            </p>
          </motion.div>

          {/* Links Rápidos */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm"
          >
            <a
              href="#inicio"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Início
            </a>
            <a
              href="#categorias"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Categorias
            </a>
            <a
              href="#cupons"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Cupons
            </a>
            <a
              href="#ofertas"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Ofertas
            </a>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 pt-6 border-t border-zinc-800/50"
        >
          <p className="text-zinc-600 text-xs text-center max-w-4xl mx-auto leading-relaxed">
            Os preços e disponibilidade dos produtos estão sujeitos a alterações sem aviso prévio. 
            Verifique sempre as condições no site da loja antes de finalizar sua compra. 
            123 Testando não é responsável por transações realizadas em sites de terceiros.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
