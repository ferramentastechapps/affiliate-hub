'use client';

import { useEffect } from 'react';

/**
 * PwaUpdater: Gerencia a atualização 100% silenciosa e automática do PWA / Service Worker.
 * 
 * Elimina qualquer aviso ou necessidade de clicar em "Atualizar", garantindo que
 * o usuário sempre utilize a versão mais recente em segundo plano.
 */
export function PwaUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Quando o novo Service Worker assume o controle (controllerchange),
    // atualizamos silenciosamente para garantir que a página use os novos assets.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // 1. Checa por nova versão imediatamente ao carregar
        registration.update().catch(() => {});

        // 2. Se já houver um worker esperando, ativa-o imediatamente sem avisar
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // 3. Monitora se um novo worker for baixado
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Quando terminar de instalar, se já existe um worker antigo controlando,
            // manda ativar o novo na hora (sem alertar o usuário)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // 4. Verificação periódica em segundo plano (a cada 10 minutos)
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 10 * 60 * 1000);

        // 5. Verifica também quando o usuário volta para o app (troca de aba ou desbloqueio)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      })
      .catch((err) => {
        console.warn('[PWA] Falha ao registrar Service Worker:', err);
      });
  }, []);

  return null;
}
