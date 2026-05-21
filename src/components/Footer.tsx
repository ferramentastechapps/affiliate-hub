"use client";

import { motion } from "framer-motion";
import { WhatsappLogo, TelegramLogo, InstagramLogo, Heart } from "@phosphor-icons/react";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (href === "#categorias") {
      window.dispatchEvent(new CustomEvent("open-categories"));
      return;
    }
    if (href === "#cupons") {
      window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "CUPOM" } }));
      const el = document.getElementById("ofertas");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return;
    }
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-zinc-400 hover:text-white transition-colors text-sm cursor-pointer"
    >
      {children}
    </a>
  );
}

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
  ];

  return (
    <footer className="w-full bg-zinc-950/50 backdrop-blur-xl border-t border-zinc-900 mt-20 pb-20 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        {/* Seção de Comunidade */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
              Junte-se à nossa comunidade! 🎉
            </h3>
            <p className="text-zinc-400 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              Receba ofertas exclusivas, cupons em primeira mão e participe de discussões sobre as melhores promoções
            </p>
          </motion.div>

          {/* Botões de Redes Sociais - 3 Canais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
            {socialLinks.map((social, index) => (
              <motion.a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`group flex items-center gap-3 px-6 py-4.5 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm transition-all duration-300 ${social.mobileColor} ${social.color} cursor-pointer`}
              >
                <div className={`p-2.5 rounded-xl ${social.bgColor} transition-colors`}>
                  <social.icon size={22} weight="fill" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">
                    {social.description}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    Entrar no canal oficial
                  </div>
                </div>
                <div className="opacity-70 transition-opacity group-hover:opacity-100 font-bold">
                  →
                </div>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-900 to-transparent mb-12" />

        {/* 3-Column Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 text-left">
          {/* Coluna 1: Links secundários */}
          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-2">Links Secundários</h4>
            <FooterLink href="#inicio">Início</FooterLink>
            <FooterLink href="#categorias">Categorias</FooterLink>
            <FooterLink href="#cupons">Cupons</FooterLink>
            <FooterLink href="#ofertas">Ofertas do Dia</FooterLink>
          </div>

          {/* Coluna 2: Diversos (Lojas Recomendadas) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-2">Lojas Recomendadas</h4>
            <a href="https://amazon.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Amazon</a>
            <a href="https://mercadolivre.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Mercado Livre</a>
            <a href="https://shopee.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Shopee</a>
            <a href="https://magazineluiza.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Magalu</a>
          </div>

          {/* Coluna 3: Social */}
          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-2">Social</h4>
            <a href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_tTelegram" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">WhatsApp</a>
            <a href="https://t.me/+OFDVybtJcc40YmZh" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Telegram</a>
            <a href="https://www.instagram.com/jota123testando?igsh=MTBuY3dueWQ4N3c3Mw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Instagram</a>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-zinc-900 mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo e Copyright */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/icons/icon-192x192.png"
                alt="Economiza ai Logo Icon"
                className="h-9 w-9 p-0.5 object-contain"
              />
              <img
                src="/logo 2 branco.png"
                alt="Economiza ai"
                className="h-6 w-auto block"
              />
            </div>
            <p className="text-zinc-500 text-xs flex items-center gap-1.5 mt-1">
              © {currentYear} Economiza ai. Feito com <Heart size={12} weight="fill" className="text-red-500" /> para você economizar
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <p className="text-zinc-650 text-[11px] text-center max-w-4xl mx-auto leading-relaxed">
            Os preços e disponibilidade dos produtos estão sujeitos a alterações sem aviso prévio. 
            Verifique sempre as condições no site da loja antes de finalizar sua compra. 
            Economiza ai não é responsável por transações realizadas em comercializações e sites de terceiros.
          </p>
        </div>
      </div>
    </footer>
  );
}
