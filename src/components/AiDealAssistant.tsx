"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Robot, X, PaperPlaneRight, Sparkle, ArrowRight, Flame, ShoppingBagOpen } from "@phosphor-icons/react";
import { useRouter, usePathname } from "next/navigation";

interface ProductItem {
  id: string;
  shortId?: number;
  name: string;
  category?: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  storeName?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  recommendedProducts?: ProductItem[];
  timestamp: Date;
}

export function AiDealAssistant() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Olá! 👋 Sou o Assistente Economizei por IA. O que você quer economizar hoje?",
      timestamp: new Date(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ocultar o botão flutuante ao rolar para baixo (scroll down) e reexibir ao rolar para cima
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsButtonVisible(false);
      } else {
        setIsButtonVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpenAiAssistant = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.query && customEvent.detail.query.trim()) {
        handleSendMessage(customEvent.detail.query);
      }
    };
    window.addEventListener("open-ai-assistant", handleOpenAiAssistant);
    return () => window.removeEventListener("open-ai-assistant", handleOpenAiAssistant);
  }, []);

  const quickPrompts = [
    "🔥 Melhores promoções de hoje",
    "📱 Smartphones até R$ 2.000",
    "🎫 Cupons de desconto ativos",
    "💻 Notebook para trabalhar"
  ];

  async function handleSendMessage(queryText?: string) {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/deal-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend })
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.replyText || "Confira os produtos encontrados no nosso catálogo:",
        recommendedProducts: Array.isArray(data.recommendedProducts) ? data.recommendedProducts : [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Erro no assistente IA:", error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Desculpe, tive uma instabilidade temporária. Tente novamente em instantes!",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Cápsula de Busca IA Flutuante (Design Ultra Profissional Glassmorphic) */}
      <AnimatePresence>
        {isButtonVisible && !isOpen && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 md:bottom-10 right-4 md:right-8 z-40"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsOpen(true)}
              className="group flex items-center gap-3 bg-zinc-950/85 hover:bg-zinc-900/95 backdrop-blur-2xl text-white px-4 py-2.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] border border-white/15 hover:border-rose-500/50 transition-all duration-300 cursor-pointer"
            >
              {/* Ícone com Gradiente Neon & Indicador Pulsante */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.4)] relative shrink-0">
                <Sparkle size={18} weight="fill" className="text-white animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950"></span>
              </div>

              {/* Texto Principal com Estilização Elegante */}
              <div className="flex flex-col text-left pr-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-400 flex items-center gap-1">
                  Busca Inteligente <Sparkle size={10} weight="fill" />
                </span>
                <span className="text-xs md:text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                  O que você procura hoje?
                </span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal / Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop escuro para fechar ao clicar fora */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Container da Janela do Chat */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-2 right-2 left-2 sm:left-auto sm:right-6 z-50 w-auto sm:w-[420px] max-h-[88vh] h-[560px] bg-zinc-950 border-2 border-rose-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
            >
              {/* Header com Botão de Fechar Bem Visível */}
              <div className="p-3.5 px-4 bg-gradient-to-r from-zinc-900 via-rose-950 to-zinc-900 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-md">
                    <Robot size={22} weight="fill" className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm flex items-center gap-1.5 leading-tight">
                      Assistente Economizei
                      <Sparkle size={14} weight="fill" className="text-amber-400" />
                    </h3>
                    <p className="text-zinc-400 text-[10px]">Busca de ofertas por IA em tempo real</p>
                  </div>
                </div>

                {/* BOTÃO DE FECHAR DESTACADO */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs shadow-lg transition-colors border border-white/20 cursor-pointer"
                  title="Fechar Assistente"
                >
                  <span>FECHAR</span>
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Corpo do Chat */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-rose-600 text-white rounded-br-none font-medium shadow-md"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* Cards de Produtos Recomendados */}
                      {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5">
                          <p className="font-black text-[11px] text-amber-400 flex items-center gap-1">
                            <Flame size={14} weight="fill" /> Ofertas Encontradas ({msg.recommendedProducts.length}):
                          </p>
                          {msg.recommendedProducts.map((p) => {
                            const pPrice = p.price || 0;
                            const pOrig = p.originalPrice || 0;
                            const pDiscount = pOrig > pPrice && pPrice > 0 ? Math.round(((pOrig - pPrice) / pOrig) * 100) : 0;

                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setIsOpen(false);
                                  router.push(`/produto/${p.shortId || p.id}`);
                                }}
                                className="flex items-center gap-2.5 p-2 bg-black/60 hover:bg-zinc-800 border border-white/10 hover:border-rose-500/50 rounded-xl cursor-pointer transition-all group"
                              >
                                <div className="w-12 h-12 shrink-0 bg-white rounded-lg p-1 flex items-center justify-center relative overflow-hidden">
                                  <img
                                    src={p.imageUrl || "/placeholder.webp"}
                                    alt={p.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.webp";
                                    }}
                                  />
                                  {pDiscount > 0 && (
                                    <span className="absolute top-0 left-0 bg-rose-600 text-white font-black text-[8px] px-1 rounded-br">
                                      -{pDiscount}%
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[11px] font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                                    {p.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                                    <span className="font-black text-emerald-400">
                                      R$ {pPrice.toFixed(2)}
                                    </span>
                                    {pOrig > pPrice && (
                                      <span className="text-zinc-500 line-through text-[10px]">
                                        R$ {pOrig.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="px-2 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0 flex items-center gap-1">
                                  <span>VER</span>
                                  <ArrowRight size={12} weight="bold" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping delay-150"></span>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping delay-300"></span>
                      <span className="text-[11px] font-bold text-zinc-300">Buscando ofertas no banco...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Botões de sugestão rápida */}
              <div className="px-3 py-2 bg-zinc-900/80 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 rounded-full text-[10px] text-zinc-300 hover:text-white whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Formulário de Envio */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 bg-zinc-950 border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Busque por um produto ou cupom..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || loading}
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold disabled:opacity-40 hover:brightness-110 transition-all shrink-0 cursor-pointer"
                >
                  <PaperPlaneRight size={16} weight="fill" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
