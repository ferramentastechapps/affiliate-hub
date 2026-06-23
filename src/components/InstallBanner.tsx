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
          className="fixed bottom-20 left-0 right-0 z-50 mx-4 mb-4 animate-slide-up"
          style={{
            animation: 'slideUp 0.4s ease-out',
          }}
        >
          <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-2xl p-4 max-w-md mx-auto border border-orange-400/20">
            <button
              onClick={handleDismiss}
              aria-label="Fechar banner de instalação"
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-white/20 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X size={20} weight="bold" className="text-white" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <img src="/icons/icon-72x72.png?v=2" alt="Economizei" className="w-10 h-10" />
              </div>

              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-1">
                  Instale o Economizei
                </h3>
                <p className="text-white/90 text-sm mb-3">
                  Receba promoções na hora e acesse offline!
                </p>

                <button
                  onClick={handleInstallClick}
                  className="w-full bg-white text-orange-600 font-semibold py-3 px-4 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 shadow-lg min-h-[48px]"
                >
                  {isIOS ? (
                    <>
                      <ShareNetwork size={20} weight="bold" />
                      Ver instruções
                    </>
                  ) : (
                    <>
                      <Download size={20} weight="bold" />
                      Instalar agora
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de instruções para iOS */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-end justify-center p-4 animate-fade-in"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="bg-zinc-900 rounded-t-3xl max-w-md w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Como instalar no iOS</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <div className="space-y-4 text-zinc-300">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Toque no botão de compartilhar</p>
                  <p className="text-sm text-zinc-400">
                    <ShareNetwork size={18} weight="fill" className="inline mr-1" />
                    Ícone na barra inferior do Safari
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Adicionar à Tela Inicial</p>
                  <p className="text-sm text-zinc-400">
                    Role para baixo e toque em &quot;Adicionar à Tela Inicial&quot;
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Confirme</p>
                  <p className="text-sm text-zinc-400">
                    Toque em &quot;Adicionar&quot; no canto superior direito
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-6 bg-orange-500 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-600 transition-colors min-h-[52px]"
            >
              Entendi!
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
          animation: slideUp 0.4s ease-out;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
