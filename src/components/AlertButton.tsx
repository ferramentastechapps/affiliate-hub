"use client";

import { useState, useEffect } from "react";
import { Bell } from "@phosphor-icons/react";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";

interface AlertButtonProps {
  productId: string;
}

export function AlertButton({ productId }: AlertButtonProps) {
  const { user } = useAuth();
  const [hasAlert, setHasAlert] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Verifica status do alerta atual
  useEffect(() => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }
    fetch(`/api/products/${productId}/alert`)
      .then(res => res.json())
      .then(data => {
        if (data.hasAlert) setHasAlert(true);
        if (data.telegramId) setTelegramId(data.telegramId);
      })
      .catch(console.error)
      .finally(() => setCheckingStatus(false));
  }, [productId, user]);

  async function toggleAlert(tid?: string) {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!hasAlert && !telegramId && !tid) {
      setShowTelegramModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: tid || telegramId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHasAlert(data.isActive);
      setShowTelegramModal(false);
    } catch (e) {
      console.error(e);
      alert("Falha ao configurar alerta");
    }
    setIsLoading(false);
  }

  return (
    <>
      <button
        onClick={() => toggleAlert()}
        disabled={isLoading || checkingStatus}
        className={`p-3 rounded-2xl transition-all ${
          hasAlert
            ? "text-yellow-400 bg-yellow-400/10"
            : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
        } ${isLoading || checkingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
        title={hasAlert ? "Alerta de preço ativo" : "Criar alerta de queda de preço"}
      >
        <Bell size={24} weight={hasAlert ? "fill" : "regular"} className={isLoading ? "animate-pulse" : ""} />
      </button>

      <AuthPanel isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Modal do Telegram */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowTelegramModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-full">
                <Bell size={32} weight="fill" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">Alerta de Preço no Telegram</h3>
            <p className="text-sm text-zinc-400 text-center mb-6">
              Para receber alertas instantâneos de queda de preço, precisamos do seu Telegram ID.
            </p>

            <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/5">
              <ol className="list-decimal pl-5 text-sm text-zinc-300 space-y-2">
                <li>Abra o bot <a href="https://t.me/EconomizeiOfertasBot" target="_blank" className="text-accent hover:underline">@EconomizeiOfertasBot</a> no Telegram</li>
                <li>Envie o comando <strong>/start</strong></li>
                <li>O bot responderá com o seu <strong>Telegram ID</strong> numérico. Cole-o abaixo:</li>
              </ol>
            </div>

            <input
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="Ex: 123456789"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-accent transition-colors mb-6 text-center text-lg tracking-wider"
            />

            <button
              onClick={() => toggleAlert(telegramId)}
              disabled={!telegramId.trim() || isLoading}
              className="w-full bg-accent hover:bg-accent-light text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Ativar Alerta"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
