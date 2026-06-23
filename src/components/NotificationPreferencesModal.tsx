'use client';

import { useState, useEffect } from 'react';
import { X, BellRinging, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'edit';
}

export function NotificationPreferencesModal({ isOpen, onClose, mode }: NotificationPreferencesModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Bem-vindo/Opções, 2 = Processando/Final
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [receiveAll, setReceiveAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);

  // Carrega categorias dinâmicas
  useEffect(() => {
    if (!isOpen) return;
    
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          setAllCategories(data.categories);
        }
      })
      .catch(console.error);

    // Se for modo edit, carrega as preferências atuais
    if (mode === 'edit') {
      setIsLoading(true);
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setSubscriptionEndpoint(subscription.endpoint);
          const res = await fetch(`/api/push/preferences?endpoint=${encodeURIComponent(subscription.endpoint)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.preferences) {
              setReceiveAll(data.preferences.all);
              setSelectedCategories(data.preferences.categories || []);
            }
          }
        }
        setIsLoading(false);
      });
    } else {
      setStep(1);
      setReceiveAll(true);
      setSelectedCategories([]);
    }
  }, [isOpen, mode]);

  const toggleCategory = (category: string) => {
    if (receiveAll) return; // Se está em "todas", não deixa mexer nas individuais
    
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const preferences = {
        all: receiveAll,
        categories: receiveAll ? [] : selectedCategories
      };

      if (mode === 'edit' && subscriptionEndpoint) {
        // Apenas atualiza
        await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscriptionEndpoint, preferences })
        });
        alert('Preferências atualizadas com sucesso!');
        onClose();
        return;
      }

      // Modo Install (POST subscribe + Permissions)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você precisa permitir as notificações no navegador para continuar.');
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          preferences
        }),
      });

      if (response.ok) {
        setStep(2); // Sucesso
        setTimeout(() => {
          onClose();
          setStep(1);
        }, 2500);
      } else {
        throw new Error('Erro ao salvar subscription');
      }

    } catch (err) {
      console.error(err);
      alert('Houve um erro ao salvar suas preferências. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <BellRinging size={22} weight="fill" className="text-orange-500" />
            </div>
            <h2 className="text-white font-bold text-lg">
              {mode === 'install' ? 'Notificações' : 'Configurar Alertas'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {step === 1 && (
          <div className="p-5 flex-1 overflow-y-auto">
            {mode === 'install' && (
              <p className="text-zinc-300 mb-6 text-sm">
                Quer receber alertas de promoções na hora? Escolha o que te interessa 👇
              </p>
            )}

            {/* Toggle Geral */}
            <div 
              className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-center justify-between mb-6 ${
                receiveAll ? 'bg-orange-500/10 border-orange-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
              onClick={() => setReceiveAll(!receiveAll)}
            >
              <div>
                <p className="text-white font-medium">🔔 Todas as promoções</p>
                <p className="text-zinc-400 text-xs mt-1">Receba tudo e não perca nenhuma oferta</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors relative ${receiveAll ? 'bg-orange-500' : 'bg-zinc-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${receiveAll ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Lista Dinâmica */}
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Categorias Específicas</h3>
            
            <div className={`space-y-2 transition-opacity ${receiveAll ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {allCategories.length === 0 ? (
                <p className="text-zinc-500 text-sm">Carregando categorias...</p>
              ) : (
                allCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <div 
                      key={cat}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50'
                      }`}
                      onClick={() => toggleCategory(cat)}
                    >
                      <span className="text-zinc-200 text-sm capitalize">{cat}</span>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-600 bg-zinc-800'
                      }`}>
                        {isSelected && <CheckCircle size={14} weight="bold" className="text-white" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isLoading || (!receiveAll && selectedCategories.length === 0)}
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : mode === 'install' ? 'Ativar Notificações' : 'Salvar Preferências'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-10 flex flex-col items-center justify-center flex-1">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} weight="fill" className="text-green-500" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Tudo certo!</h3>
            <p className="text-zinc-400 text-center text-sm">
              Suas preferências foram salvas. Você será notificado sobre as melhores ofertas.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
