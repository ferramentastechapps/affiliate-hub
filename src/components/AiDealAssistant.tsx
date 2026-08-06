"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Robot, X, PaperPlaneRight, Sparkle, Tag, ArrowRight, Flame } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  recommendedProducts?: any[];
  timestamp: Date;
}

export function AiDealAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Olá! 👋 Sou o Assistente Economizei com Inteligência Artificial. O que você está procurando economizar hoje?",
      timestamp: new Date(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

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

      let fetchedProducts: any[] = [];
      if (data.recommendedProductIds && data.recommendedProductIds.length > 0) {
        // Buscar dados dos produtos recomendados
        const prodRes = await fetch("/api/products?filter=recentes");
        const allProds = await prodRes.json();
        fetchedProducts = allProds.filter((p: any) => 
          data.recommendedProductIds.includes(p.id) || 
          data.recommendedProductIds.includes(String(p.shortId))
        );
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.replyText || "Aqui estão os produtos mais indicados para o seu pedido:",
        recommendedProducts: fetchedProducts,
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
          text: "Desculpe, tive um contratempo ao consultar o catálogo. Tente novamente em alguns instantes!",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão Flutuante */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-8 right-5 z-40 flex items-center gap-2 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-bold px-4 py-3 rounded-full shadow-[0_0_25px_rgba(244,63,94,0.4)] border border-white/20"
      >
        <div className="relative flex items-center justify-center">
          <Robot size={22} weight="fill" className="animate-bounce" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950"></span>
        </div>
        <span className="text-xs md:text-sm hidden sm:inline">Assistente IA</span>
      </motion.button>

      {/* Modal Slide-over do Assistente */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-600/30 via-purple-600/30 to-indigo-600/30 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-md">
                  <Robot size={22} weight="fill" className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    Assistente Economizei
                    <Sparkle size={14} weight="fill" className="text-amber-400" />
                  </h3>
                  <p className="text-zinc-400 text-[10px]">IA treinada para caçar as melhores ofertas</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-br-none shadow-md"
                        : "bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Cards de Produtos Recomendados */}
                    {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <p className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                          <Flame size={12} weight="fill" /> Sugestões Encontradas:
                        </p>
                        {msg.recommendedProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setIsOpen(false);
                              router.push(`/produto/${p.shortId || p.id}`);
                            }}
                            className="flex items-center gap-2.5 p-2 bg-black/40 hover:bg-black/70 border border-white/10 rounded-xl cursor-pointer transition-colors"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 object-contain rounded-lg bg-white p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-semibold text-white truncate">{p.name}</h4>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-black text-emerald-400">
                                  R$ {p.price?.toFixed(2)}
                                </span>
                                {p.originalPrice > p.price && (
                                  <span className="text-zinc-500 line-through">
                                    R$ {p.originalPrice?.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-rose-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-white/10 p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping delay-150"></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping delay-300"></span>
                    <span className="text-[10px] text-zinc-400 ml-1">Analisando ofertas...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-3 py-2 bg-zinc-900/50 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-zinc-300 whitespace-nowrap transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-zinc-950 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Pergunte sobre produtos ou cupons..."
                className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
