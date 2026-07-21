"use client";

import { useState, useRef, useEffect } from "react";
import { ChatCircle, X, PaperPlaneRight, Sparkle, User, CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ShoppingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Jota, assistente inteligente do Economizei. Estou aqui para te ajudar a encontrar as melhores ofertas. O que você está procurando hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presets = [
    "🔥 Melhores descontos hoje",
    "💻 Notebook para trabalho",
    "📺 Indicações de TV barata",
    "🎫 Algum cupom ativo?",
  ];

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ops, tive um probleminha para processar sua pergunta. Pode tentar novamente?" },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Não consegui me conectar com a IA no momento. Verifique sua conexão." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper para renderizar links markdown [Texto](/produto/id)
  const renderMessageContent = (content: string) => {
    const parts = [];
    let lastIndex = 0;
    // Regex para achar links markdown: [Texto](/produto/id)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      const index = match.index;

      // Adiciona o texto antes do link
      if (index > lastIndex) {
        parts.push(content.substring(lastIndex, index));
      }

      // Adiciona o link renderizado
      parts.push(
        <a
          key={index}
          href={url}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 mx-1 font-bold text-[11px] sm:text-xs rounded bg-accent/20 text-accent hover:bg-accent hover:text-white transition-colors border border-accent/20 cursor-pointer"
        >
          {text}
        </a>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Janela de Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-[92vw] sm:w-[400px] h-[550px] bg-[#0c0d12]/95 border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl mb-4"
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-accent/20 text-accent flex items-center justify-center">
                  <Sparkle size={20} weight="fill" className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white leading-tight">Pergunte ao Jota</h4>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Online e ativo
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
              >
                <X size={16} />
              </button>
            </div>

            {/* Balões de Mensagem */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Sparkle size={14} weight="fill" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-[1.25rem] px-4 py-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#ff334b] text-white rounded-tr-none font-medium shadow-md shadow-[#ff334b]/15"
                        : "bg-white/5 border border-white/5 text-[#8e92a4] rounded-tl-none"
                    }`}
                  >
                    {renderMessageContent(m.content)}
                  </div>
                  {m.role === "user" && (
                    <div className="w-7 h-7 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                      <User size={14} weight="bold" />
                    </div>
                  )}
                </div>
              ))}

              {/* Bolha de carregamento */}
              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Sparkle size={14} weight="fill" />
                  </div>
                  <div className="bg-white/5 border border-white/5 text-zinc-500 rounded-[1.25rem] rounded-tl-none px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões Rápidas */}
            {messages.length === 1 && !loading && (
              <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSend(preset)}
                    className="text-[10px] sm:text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 transition-all text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-4 border-t border-white/5 bg-white/[0.01] flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre qualquer produto..."
                className="flex-1 bg-white/5 border border-white/5 rounded-full px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent/40"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-[#ff334b] text-white rounded-full transition-all hover:bg-[#ff334b]/95 disabled:opacity-50 disabled:hover:bg-[#ff334b]"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão de Abrir/Fechar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#ff334b] hover:bg-[#d9223a] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#ff334b]/20 hover:scale-105 active:scale-95 transition-all"
      >
        <ChatCircle size={28} weight="fill" />
      </button>
    </div>
  );
}
