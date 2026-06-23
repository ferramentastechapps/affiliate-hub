'use client';

import { useState, useEffect } from 'react';
import { X, Download, ShareNetwork } from '@phosphor-icons/react';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  useEffect(() => {
    // Verifica se já foi instalado ou se o usuário já fechou o banner recentemente
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const bannerDismissed = localStorage.getItem('installBannerDismissed');
    
    if (isInstalled || bannerDismissed === 'installed') {
      return;
    }

    if (bannerDismissed) {
      if (bannerDismissed === 'true') {
        // Legado: converte para timestamp a partir de agora
        localStorage.setItem('installBannerDismissed', Date.now().toString());
        return;
      }

      const dismissedTime = parseInt(bannerDismissed, 10);
      if (!isNaN(dismissedTime)) {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < thirtyDaysInMs) {
          return;
        }
      }
    }

    // Detecta iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(iOS);

    // Para iOS, mostra o banner após 3 segundos
    if (iOS) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Para Android/Desktop, captura o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Evento de instalação concluída
    const handleAppInstalled = () => {
      setShowBanner(false);
      setShowPreferencesModal(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('installBannerDismissed', 'installed');
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  if (!showBanner && !showPreferencesModal) return null;

  return (
    <>
      {showBanner && (
        <div
          className="fixed bottom-24 left-0 right-0 z-50 mx-4 mb-2 animate-slide-up"
          style={{
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="relative bg-zinc-950/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 max-w-md mx-auto border border-white/10 overflow-hidden group">
            {/* Efeito de iluminação interna de fundo */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Linha de borda superior brilhante */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

            <button
              onClick={handleDismiss}
              aria-label="Fechar banner de instalação"
              className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 hover:rotate-90 transition-all duration-300 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <X size={16} weight="bold" />
            </button>

            <div className="flex items-center gap-4">
              {/* Ícone com borda brilhante animada */}
              <div className="flex-shrink-0 relative w-14 h-14 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 group-hover:border-orange-500/30 transition-colors duration-300">
                <img 
                  src="/icons/icon-192x192.png" 
                  alt="Economizei" 
                  className="w-11 h-11 object-contain rounded-xl transform group-hover:scale-110 transition-transform duration-500" 
                />
                {/* Efeito glow pulsante atrás da imagem no hover */}
                <span className="absolute inset-0 rounded-2xl bg-orange-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
              </div>

              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-white font-bold text-base tracking-tight">
                    Economizei App
                  </h3>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-400">
                    Oficial
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Instale para receber alertas de bugs, cupons e ofertas exclusivas!
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                onClick={handleDismiss}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 font-medium py-3 px-4 rounded-xl border border-white/5 transition-all active:scale-[0.98] text-xs min-h-[44px]"
              >
                Depois
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(239,68,68,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs min-h-[44px]"
              >
                {isIOS ? (
                  <>
                    <ShareNetwork size={16} weight="bold" />
                    Como Instalar
                  </>
                ) : (
                  <>
                    <Download size={16} weight="bold" />
                    Instalar Agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de instruções para iOS */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end justify-center p-4 animate-fade-in"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-zinc-950/95 backdrop-blur-md rounded-2xl max-w-md w-full p-6 border border-white/10 animate-slide-up shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <ShareNetwork size={18} className="text-orange-400" />
                </div>
                <h3 className="text-white font-bold text-base">Instalar no seu iPhone</h3>
              </div>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-zinc-300">
              <div className="flex gap-3.5 items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">Toque em compartilhar</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Toque no botão de compartilhar do Safari (aquele ícone de quadrado com seta para cima <ShareNetwork size={14} className="inline-block align-text-bottom mx-0.5" /> na barra inferior).
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">Adicione à tela de início</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Role a folha de opções para baixo e clique em <strong className="text-white">&quot;Adicionar à Tela de Início&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">Finalize a instalação</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Toque em <strong className="text-white">&quot;Adicionar&quot;</strong> no canto superior direito para confirmar.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-[0_4px_20px_rgba(239,68,68,0.2)] transition-all active:scale-[0.98] min-h-[50px] text-sm"
            >
              Pronto, entendi!
            </button>
          </div>
        </div>
      )}

      {/* Modal de Preferências de Notificação após Instalação */}
      <NotificationPreferencesModal 
        isOpen={showPreferencesModal} 
        onClose={() => setShowPreferencesModal(false)}
        mode="install"
      />

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
