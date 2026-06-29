'use client';

import { useState, useEffect } from 'react';
import { Camera, PaperPlaneRight, Trash, ArrowsClockwise, Image as ImageIcon, CheckCircle, Warning, Clock, ArrowSquareOut } from '@phosphor-icons/react';

type QueueItem = {
  produto: any;
  platform: string;
  affiliate_link: string;
  added_at: number;
};

type QueuesData = {
  fila_lifestyle: QueueItem[];
  fila_sem_lifestyle: QueueItem[];
  fila_manual: QueueItem[];
  ultimo_envio_grupo: number;
};

const formatTimeAgo = (timestampSeconds: number) => {
  const now = Date.now() / 1000;
  const diff = now - timestampSeconds;
  
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`;
  return `há ${Math.floor(diff / 86400)}d`;
};

const PLATFORM_EMOJIS: Record<string, string> = {
  amazon: '📦',
  shopee: '🛍️',
  aliexpress: '🌍',
  mercadoLivre: '🤝',
  tiktok: '🎵',
  magalu: '💙',
  netshoes: '👟',
  kabum: '💥',
};

export default function QueuesPage() {
  const [data, setData] = useState<QueuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fila_lifestyle' | 'fila_sem_lifestyle' | 'fila_manual'>('fila_lifestyle');
  const [nextPublishTime, setNextPublishTime] = useState<string>('');

  // Modals state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, queue: string, currentPhoto?: string } | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, description: string, action: () => void, loading: boolean }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => {},
    loading: false
  });

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queues');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  useEffect(() => {
    if (!data?.ultimo_envio_grupo) return;
    
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const nextTime = data.ultimo_envio_grupo + 300; // +5 minutes
      const diff = nextTime - now;
      
      if (diff <= 0) {
        setNextPublishTime('Pronto para publicar');
      } else {
        const m = Math.floor(diff / 60);
        const s = Math.floor(diff % 60);
        setNextPublishTime(`Próximo em ${m}m ${s}s`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [data?.ultimo_envio_grupo]);

  const handleUpdatePhoto = async () => {
    if (!selectedProduct || !newPhotoUrl) return;
    setSavingPhoto(true);
    
    try {
      const res = await fetch('/api/admin/queues/lifestyle-photo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          queue: selectedProduct.queue,
          enhancedImageUrl: newPhotoUrl
        })
      });
      
      if (res.ok) {
        alert(selectedProduct.queue === 'fila_sem_lifestyle' ? '✅ Foto adicionada! Produto movido para fila Lifestyle.' : '✅ Foto atualizada!');
        setPhotoModalOpen(false);
        fetchQueues();
      } else {
        const err = await res.json();
        alert('Erro: ' + (err.error || 'Falha ao atualizar'));
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePublish = async (productId: string, queue: string) => {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/queues/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, queue })
      });
      
      if (res.ok) {
        alert('🚀 Publicado com sucesso!');
        fetchQueues();
      } else {
        const err = await res.json();
        alert('Erro: ' + (err.error || 'Falha ao publicar'));
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const handleRemove = async (productId: string, queue: string) => {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/queues/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, queue })
      });
      
      if (res.ok) {
        fetchQueues();
      } else {
        const err = await res.json();
        alert('Erro: ' + (err.error || 'Falha ao remover'));
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const openPublishConfirm = (productId: string, queue: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Publicar Agora?',
      description: 'Isso ignora o intervalo de 5 minutos e posta o produto no Telegram imediatamente.',
      action: () => handlePublish(productId, queue),
      loading: false
    });
  };

  const openRemoveConfirm = (productId: string, queue: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover da Fila?',
      description: 'O produto não será publicado no grupo e será removido da fila atual.',
      action: () => handleRemove(productId, queue),
      loading: false
    });
  };

  const renderProductCard = (item: QueueItem, queue: string) => {
    const p = item.produto || {};
    const imgUrl = p.enhancedImageUrl && !p.enhancedImageUrl.includes('placeholder') 
      ? p.enhancedImageUrl 
      : (p.imageUrl || '');
      
    return (
      <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden transition hover:border-zinc-700">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 relative border border-zinc-700">
            {imgUrl ? (
              <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <ImageIcon size={32} />
              </div>
            )}
            {queue === 'fila_sem_lifestyle' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 p-1 text-xs font-bold rounded-bl-lg">
                Sem Foto
              </div>
            )}
          </div>
          
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-zinc-100 font-medium text-sm line-clamp-2 leading-snug mb-1" title={p.name}>
              {p.name || 'Produto Desconhecido'}
            </h3>
            
            {item.affiliate_link && (
              <a 
                href={item.affiliate_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 mb-2 w-fit"
                title="Abrir página do produto"
              >
                <ArrowSquareOut size={12} />
                Abrir na loja
              </a>
            )}
            
            <div className="flex items-center gap-2 mt-auto">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 whitespace-nowrap">
                {PLATFORM_EMOJIS[item.platform] || '📦'} {item.platform}
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                R$ {Number(p.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
              <Clock size={14} />
              <span>{formatTimeAgo(item.added_at)}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-zinc-800/50">
          {(queue === 'fila_lifestyle' || queue === 'fila_manual') ? (
            <>
              <button 
                onClick={() => {
                  setSelectedProduct({ id: p.id, queue, currentPhoto: p.enhancedImageUrl });
                  setNewPhotoUrl(p.enhancedImageUrl && !p.enhancedImageUrl.includes('placeholder') ? p.enhancedImageUrl : '');
                  setPhotoModalOpen(true);
                }}
                className="col-span-2 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
              >
                <Camera size={16} /> Trocar Foto
              </button>
              <button 
                onClick={() => openPublishConfirm(p.id, queue)}
                className="flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
              >
                <PaperPlaneRight size={16} /> Publicar Agora
              </button>
              <button 
                onClick={() => openRemoveConfirm(p.id, queue)}
                className="flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition"
              >
                <Trash size={16} /> Remover
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setSelectedProduct({ id: p.id, queue, currentPhoto: p.enhancedImageUrl });
                  setNewPhotoUrl('');
                  setPhotoModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-xs font-bold transition"
              >
                <Camera size={16} /> Adicionar Foto
              </button>
              <button 
                onClick={() => openRemoveConfirm(p.id, queue)}
                className="flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition"
              >
                <Trash size={16} /> Remover
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const getActiveArray = () => {
    if (!data) return [];
    return data[activeTab] || [];
  };

  const lastPublishDate = data?.ultimo_envio_grupo 
    ? new Date(data.ultimo_envio_grupo * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Nunca';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Filas do Telegram</h1>
          <p className="text-zinc-400 mt-2">Gerencie os produtos aguardando envio para o grupo VIP.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex flex-col items-center min-w-[200px]">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Último Envio</span>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle size={16} className="text-emerald-500" />
              <span className="text-zinc-100 font-bold">{lastPublishDate}</span>
            </div>
            <span className="text-xs text-indigo-400 mt-1 font-medium">{nextPublishTime}</span>
          </div>
          
          <button 
            onClick={fetchQueues}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium transition disabled:opacity-50 h-full"
          >
            <ArrowsClockwise size={20} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('fila_lifestyle')}
          className={`flex-1 min-w-[150px] py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'fila_lifestyle' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Lifestyle ({data?.fila_lifestyle?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('fila_sem_lifestyle')}
          className={`flex-1 min-w-[150px] py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'fila_sem_lifestyle' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Sem Lifestyle ({data?.fila_sem_lifestyle?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('fila_manual')}
          className={`flex-1 min-w-[150px] py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'fila_manual' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Manual ({data?.fila_manual?.length || 0})
        </button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-zinc-900 rounded-xl border border-zinc-800"></div>
          ))}
        </div>
      ) : getActiveArray().length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-300">Fila Vazia</h3>
          <p className="text-zinc-500 mt-2 text-center max-w-sm">Nenhum produto nesta fila no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getActiveArray().map(item => renderProductCard(item, activeTab))}
        </div>
      )}

      {/* Modal de Confirmação Genérico */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-100">{confirmModal.title}</h2>
            <p className="text-zinc-400 mt-2">{confirmModal.description}</p>
            
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                disabled={confirmModal.loading}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.action}
                disabled={confirmModal.loading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {confirmModal.loading ? <ArrowsClockwise size={20} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar/Trocar Foto */}
      {photoModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Camera size={24} className="text-indigo-400" />
              {selectedProduct.queue === 'fila_sem_lifestyle' ? 'Adicionar Foto Lifestyle' : 'Trocar Foto Lifestyle'}
            </h2>
            
            {selectedProduct.queue === 'fila_sem_lifestyle' && (
              <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex gap-3 text-indigo-300 text-sm">
                <Warning size={20} weight="fill" className="flex-shrink-0" />
                <p>Ao salvar a foto, este produto será movido automaticamente para a <strong>Fila Lifestyle</strong> e ficará pronto para o Telegram.</p>
              </div>
            )}
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">URL da Imagem (direta)</label>
                <input 
                  type="text" 
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 h-48 flex items-center justify-center relative">
                {newPhotoUrl ? (
                  <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Erro ao carregar imagem';
                  }} />
                ) : (
                  <div className="text-zinc-600 flex flex-col items-center gap-2">
                    <ImageIcon size={32} />
                    <span className="text-sm font-medium">Preview da imagem</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setPhotoModalOpen(false)}
                disabled={savingPhoto}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdatePhoto}
                disabled={savingPhoto || !newPhotoUrl.trim()}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingPhoto ? <ArrowsClockwise size={20} className="animate-spin" /> : 'Salvar Foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
