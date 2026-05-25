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
            className="relative z-10 font-sans"
          >
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
              Junte-se à nossa comunidade! 🎉
            </h2>
            <p className="text-zinc-400 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              Receba ofertas exclusivas, cupons em primeira mão e participe de discussões sobre as melhores promoções
            </p>
          </motion.div>
 
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto relative z-10">
            {socialLinks.map((social, index) => {
              // Obter cores específicas da marca para botões e glows
              let brandColor = "#25d366";
              let outlineBtnClass = "border-[#25d366]/40 text-[#25d366] hover:bg-[#25d366] hover:border-[#25d366] hover:text-white";
              let bgGlow = "rgba(37,211,102,0.06)";

              if (social.name === "Telegram") {
                brandColor = "#0088cc";
                outlineBtnClass = "border-[#0088cc]/40 text-[#0088cc] hover:bg-[#0088cc] hover:border-[#0088cc] hover:text-white";
                bgGlow = "rgba(0,136,204,0.06)";
              } else if (social.name === "Instagram") {
                brandColor = "#e1306c";
                outlineBtnClass = "border-[#e1306c]/40 text-[#e1306c] hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:border-transparent hover:text-white";
                bgGlow = "rgba(225,48,108,0.06)";
              }

              return (
                <motion.div
                  key={social.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-[#12141c]/50 border border-white/[0.04] rounded-[24px] p-5 flex flex-col justify-between transition-all duration-300 hover:border-white/[0.1] hover:bg-[#12141c] hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] group h-[170px]"
                >
                  {/* Top Row - Horizontal Layout */}
                  <div className="flex items-center justify-between w-full">
                    {/* Left Icon with sutil background glow */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: bgGlow,
                        color: brandColor,
                        boxShadow: `0 0 15px ${bgGlow}`
                      }}
                    >
                      <social.icon size={22} weight="bold" />
                    </div>

                    {/* Middle Info */}
                    <div className="flex flex-col items-start flex-1 ml-3.5 text-left">
                      <span className="text-sm font-black text-white leading-tight">{social.name}</span>
                      <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors mt-0.5">Clique para seguir</span>
                    </div>

                    {/* Right Arrow */}
                    <div className="text-zinc-600 group-hover:text-white transition-colors">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.66663 11.3333L11.3333 4.66663" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4.66663 4.66663H11.3333V11.3333" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Bottom Outline Button */}
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 rounded-xl border text-[11px] font-extrabold tracking-wider uppercase text-center transition-all duration-300 ${outlineBtnClass}`}
                  >
                    Clique para seguir
                  </a>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
 
      {/* Rodapé Principal */}
      <div className="bg-[#06070a] border-t border-border-custom py-16">
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            
            {/* Coluna 1: Info e Social Icons */}
            <div className="flex flex-col gap-4">
              <a href="#" className="flex items-center gap-2.5 text-decoration-none select-none">
                <svg
                  viewBox="0 0 36 36"
                  className="w-9 h-9 fill-[#ff334b] drop-shadow-[0_4px_10px_rgba(255,51,75,0.3)]"
                >
                  <polygon points="18,2 34,11 28,32 8,32 2,11" />
                  <text
                    x="18"
                    y="25"
                    fill="white"
                    fontSize="19"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    E
                  </text>
                </svg>
                <span className="text-white font-extrabold text-xl tracking-tight leading-none">
                  economiza<span className="text-[#ff334b]">ai</span>
                </span>
              </a>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-[320px]">
                Encontre as melhores ofertas e cupons de desconto das principais lojas online do Brasil em um só lugar de maneira automatizada e ágil.
              </p>
            </div>
 
            {/* Coluna 2: Links secundários */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-2">Links secundários</h4>
              <FooterLink href="#inicio">Início</FooterLink>
              <FooterLink href="#categorias">Categorias</FooterLink>
              <FooterLink href="#cupons">Cupons</FooterLink>
              <FooterLink href="#footer">Comunidade</FooterLink>
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
              <div className="flex gap-2.5 mb-2">
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <FacebookLogo size={16} weight="fill" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <TwitterLogo size={16} weight="fill" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <InstagramLogo size={16} weight="bold" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                  <YoutubeLogo size={16} weight="fill" />
                </a>
              </div>
              <FooterLink href="#inicio">Início</FooterLink>
              <FooterLink href="#categorias">Categorias</FooterLink>
              <FooterLink href="#cupons">Cupons</FooterLink>
              <FooterLink href="#ofertas">Ofertas</FooterLink>
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
