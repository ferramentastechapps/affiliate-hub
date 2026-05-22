"use client";

import { motion } from "framer-motion";
import { WhatsappLogo, TelegramLogo, InstagramLogo, Heart, FacebookLogo, TwitterLogo, YoutubeLogo } from "@phosphor-icons/react";

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
      description: "Grupo WhatsApp",
    },
    {
      name: "Telegram",
      icon: TelegramLogo,
      url: "https://t.me/+OFDVybtJcc40YmZh",
      description: "Canal Telegram",
    },
    {
      name: "Instagram",
      icon: InstagramLogo,
      url: "https://www.instagram.com/jota123testando?igsh=MTBuY3dueWQ4N3c3Mw%3D%3D&utm_source=qr",
      description: "Siga no Instagram",
    },
  ];

  return (
    <footer className="w-full mt-20">
      {/* Seção de Comunidade */}
      <section className="max-w-[1200px] mx-auto px-6 mb-16">
        <div className="bg-gradient-to-b from-[#ff334b]/[0.08] to-transparent bg-card border border-border-custom rounded-[28px] p-12 text-center relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Junte-se à nossa comunidade! 🎉
            </h2>
            <p className="text-zinc-400 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              Receba ofertas exclusivas, cupons em primeira mão e participe de discussões sobre as melhores promoções
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto relative z-10">
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
                className={`group flex flex-col items-center p-6 bg-white/[0.02] border border-border-custom rounded-[20px] transition-all duration-300 ${
                  social.name === "WhatsApp"
                    ? "hover:bg-[#25d366]/[0.04] hover:border-[#25d366]/40 hover:shadow-[0_8px_24px_rgba(37,211,102,0.08)]"
                    : social.name === "Telegram"
                    ? "hover:bg-[#0088cc]/[0.04] hover:border-[#0088cc]/40 hover:shadow-[0_8px_24px_rgba(0,136,204,0.08)]"
                    : "hover:bg-[#e1306c]/[0.04] hover:border-[#e1306c]/40 hover:shadow-[0_8px_24px_rgba(225,48,108,0.08)]"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 mb-4 ${
                    social.name === "WhatsApp"
                      ? "bg-white/5 text-[#25d366] group-hover:bg-[#25d366] group-hover:text-white"
                      : social.name === "Telegram"
                      ? "bg-white/5 text-[#0088cc] group-hover:bg-[#0088cc] group-hover:text-white"
                      : "bg-white/5 text-[#e1306c] group-hover:bg-gradient-to-tr group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:text-white"
                  }`}
                >
                  <social.icon size={24} weight="bold" />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-sm font-bold text-white">{social.description}</span>
                  <span className="text-[12px] text-zinc-500 group-hover:text-white/60 transition-colors">Clique para seguir</span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Rodapé Principal */}
      <div className="bg-[#06070a] border-t border-border-custom py-16">
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            
            {/* Coluna 1: Info e Social Icons */}
            <div className="flex flex-col gap-4">
              <a href="#" className="flex items-center gap-2 text-decoration-none select-none">
                <div className="bg-[#ff334b] text-white font-extrabold text-[20px] w-9 h-9 flex items-center justify-center rounded-[8px] shadow-[0_4px_12px_rgba(255,51,75,0.3)]">
                  E
                </div>
                <span className="text-white font-bold text-[20px] tracking-tight">economizai</span>
              </a>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-[320px]">
                Encontre as melhores ofertas e cupons de desconto das principais lojas online do Brasil em um só lugar de maneira automatizada e ágil.
              </p>
              <div className="flex gap-3 mt-2">
                <a href="#" className="w-9 h-9 rounded-[8px] bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <FacebookLogo size={18} weight="fill" />
                </a>
                <a href="#" className="w-9 h-9 rounded-[8px] bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <TwitterLogo size={18} weight="fill" />
                </a>
                <a href="#" className="w-9 h-9 rounded-[8px] bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <InstagramLogo size={18} weight="bold" />
                </a>
                <a href="#" className="w-9 h-9 rounded-[8px] bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <YoutubeLogo size={18} weight="fill" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Links secundários */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">Links secundários</h4>
              <FooterLink href="#inicio">Início</FooterLink>
              <FooterLink href="#categorias">Categorias</FooterLink>
              <FooterLink href="#cupons">Cupons</FooterLink>
              <FooterLink href="#ofertas">Ofertas do Dia</FooterLink>
            </div>

            {/* Coluna 3: Diversos */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">Diversos</h4>
              <a href="#ofertas" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "Moda" } })); }} className="text-zinc-400 hover:text-white transition-colors text-sm">Moda e Acessórios</a>
              <a href="#ofertas" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "TV" } })); }} className="text-zinc-400 hover:text-white transition-colors text-sm">Smartphones e TV</a>
              <a href="#ofertas" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("search-change", { detail: { query: "Casa" } })); }} className="text-zinc-400 hover:text-white transition-colors text-sm">Casa e Eletrodomésticos</a>
            </div>

            {/* Coluna 4: Social */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">Social</h4>
              <a href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_tTelegram" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">WhatsApp</a>
              <a href="https://t.me/+OFDVybtJcc40YmZh" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Telegram</a>
              <a href="https://www.instagram.com/jota123testando?igsh=MTBuY3dueWQ4N3c3Mw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors text-sm">Instagram</a>
            </div>

          </div>

          {/* Copyright e Disclaimer */}
          <div className="border-t border-white/[0.04] pt-8 mt-8 flex flex-col items-center gap-4 text-center">
            <p className="text-zinc-500 text-xs flex items-center gap-1.5 justify-center">
              © {currentYear} economizai. Feito com <Heart size={12} weight="fill" className="text-[#ff334b]" /> para você economizar.
            </p>
            <p className="text-[#ffffff]/25 text-[11px] max-w-[800px] leading-relaxed mx-auto">
              Os preços e a disponibilidade dos produtos estão sujeitos a alterações sem aviso prévio. Verifique sempre as condições no site da loja parceira antes de finalizar sua compra. Economizai não se responsabiliza pelas compras realizadas nos links externos.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
