'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Megaphone, 
  Plus, 
  MagnifyingGlass, 
  Trash, 
  PaperPlaneTilt, 
  PencilSimple, 
  Copy, 
  X,
  BellRinging,
  PaperPlaneRight,
  ChatCircleText,
  Clock,
  WarningCircle,
  CheckCircle,
  CircleDashed,
  DeviceMobile,
} from '@phosphor-icons/react';
import { useToastContext } from '@/components/ToastProvider';

interface Campaign {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  totalTargets: number;
  totalSent: number;
  totalFailed: number;
  metadata: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string, color: string, icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: CircleDashed },
  scheduled: { label: 'Agendado', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  sending: { label: 'Enviando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse', icon: PaperPlaneRight },
  sent: { label: 'Enviado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: WarningCircle },
};

const CHANNEL_MAP: Record<string, { label: string, icon: React.ElementType, color: string }> = {
  push: { label: 'Push', icon: BellRinging, color: 'text-teal-400 bg-teal-500/10' },
  telegram: { label: 'Telegram', icon: PaperPlaneRight, color: 'text-sky-400 bg-sky-500/10' },
  whatsapp: { label: 'WhatsApp', icon: ChatCircleText, color: 'text-green-400 bg-green-500/10' },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

export default function CampaignsPage() {
  const toast = useToastContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ id: string, channel: string, title: string, targets?: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('push');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Push metadata
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('/icons/icon-192x192.png');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/campaigns?${params}`);
      const data = await res.json();
      if (!data.error) {
        setCampaigns(data.campaigns);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [page, channelFilter, statusFilter, toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const openNewModal = () => {
    setFormId(null);
    setTitle('');
    setMessage('');
    setChannel('push');
    setIsScheduled(false);
    setScheduledAt('');
    setUrl('');
    setIcon('/icons/icon-192x192.png');
    setShowModal(true);
  };

  const openEditModal = (camp: Campaign) => {
    setFormId(camp.id);
    setTitle(camp.title);
    setMessage(camp.message);
    setChannel(camp.channel);
    if (camp.scheduledAt) {
      setIsScheduled(true);
      // Format para o input datetime-local: YYYY-MM-DDThh:mm
      setScheduledAt(new Date(camp.scheduledAt).toISOString().slice(0, 16));
    } else {
      setIsScheduled(false);
      setScheduledAt('');
    }
    
    if (camp.channel === 'push' && camp.metadata) {
      try {
        const meta = JSON.parse(camp.metadata);
        setUrl(meta.url || '');
        setIcon(meta.icon || '/icons/icon-192x192.png');
      } catch (e) {}
    } else {
      setUrl('');
      setIcon('/icons/icon-192x192.png');
    }
    
    setShowModal(true);
  };

  const handleDuplicate = (camp: Campaign) => {
    setFormId(null); // Nova campanha
    setTitle(`${camp.title} (Cópia)`);
    setMessage(camp.message);
    setChannel(camp.channel);
    setIsScheduled(false);
    setScheduledAt('');
    if (camp.channel === 'push' && camp.metadata) {
      try {
        const meta = JSON.parse(camp.metadata);
        setUrl(meta.url || '');
        setIcon(meta.icon || '/icons/icon-192x192.png');
      } catch (e) {}
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta campanha?')) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Campanha deletada com sucesso');
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar campanha');
    }
  };

  const handleSave = async (sendNow = false) => {
    if (!title.trim() || !message.trim()) {
      toast.warning('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title,
        message,
        channel,
      };

      if (!sendNow && isScheduled && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      if (channel === 'push') {
        payload.metadata = { url, icon };
      }

      const method = formId ? 'PUT' : 'POST';
      const endpoint = formId ? `/api/admin/campaigns/${formId}` : '/api/admin/campaigns';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success('Campanha salva com sucesso');
      setShowModal(false);
      fetchCampaigns();

      if (sendNow) {
        setShowConfirm({
          id: data.campaign.id,
          channel: data.campaign.channel,
          title: data.campaign.title,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar campanha');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Envio iniciado com sucesso');
      setShowConfirm(null);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar envio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-indigo-400" weight="duotone" />
            Campanhas
          </h1>
          <p className="text-zinc-400 mt-1">Gerencie mensagens em lote e notificações multi-canal.</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={channelFilter}
          onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">Todos os Canais</option>
          <option value="push">Push Notifications</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">Todos os Status</option>
          <option value="draft">Rascunho</option>
          <option value="scheduled">Agendado</option>
          <option value="sending">Enviando</option>
          <option value="sent">Enviado</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Título</th>
                <th className="px-6 py-4 font-medium">Canal</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Sucesso / Falha</th>
                <th className="px-6 py-4 font-medium">Criado em</th>
                <th className="px-6 py-4 font-medium">Agendamento</th>
                <th className="px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const statusInfo = STATUS_MAP[camp.status] || STATUS_MAP.draft;
                  const StatusIcon = statusInfo.icon;
                  const channelInfo = CHANNEL_MAP[camp.channel] || CHANNEL_MAP.push;
                  const ChannelIcon = channelInfo.icon;

                  return (
                    <tr key={camp.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-200">
                        {camp.title}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${channelInfo.color}`}>
                          <ChannelIcon weight="fill" className="w-3 h-3" />
                          {channelInfo.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          <StatusIcon weight="fill" className="w-3 h-3" />
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 text-xs">
                          <span className="text-emerald-400">{camp.totalSent}</span>
                          <span className="text-red-400">{camp.totalFailed}</span>
                          <span className="text-zinc-600">/ {camp.totalTargets || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {formatDate(camp.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {formatDate(camp.scheduledAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(camp.status === 'draft' || camp.status === 'scheduled') && (
                            <button
                              onClick={() => setShowConfirm({ id: camp.id, channel: camp.channel, title: camp.title })}
                              title="Enviar Agora"
                              className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                            >
                              <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                            </button>
                          )}
                          {camp.status === 'draft' && (
                            <button
                              onClick={() => openEditModal(camp)}
                              title="Editar"
                              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                            >
                              <PencilSimple weight="fill" className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(camp)}
                            title="Duplicar"
                            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <Copy weight="fill" className="w-4 h-4" />
                          </button>
                          {(camp.status === 'draft' || camp.status === 'failed') && (
                            <button
                              onClick={() => handleDelete(camp.id)}
                              title="Deletar"
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash weight="fill" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <span className="text-sm text-zinc-500">
              Página {page} de {totalPages} • {total} campanhas
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova/Editar Campanha */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-100">
                {formId ? 'Editar Campanha' : 'Nova Campanha'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
              {/* Form Section */}
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Canal de Envio</label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(CHANNEL_MAP).map(([key, info]) => {
                      const Icon = info.icon;
                      const isActive = channel === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setChannel(key)}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            isActive ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <Icon weight={isActive ? "fill" : "regular"} className="w-6 h-6" />
                          <span className="text-xs font-medium">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Título da Campanha <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Oferta Especial de Sexta!"
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Mensagem <span className="text-red-400">*</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                    rows={6}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {channel === 'push' && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <h4 className="text-sm font-medium text-zinc-400">Opções do Push Notification</h4>
                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-1.5 block">URL de Destino</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-1.5 block">URL do Ícone (opcional)</label>
                      <input
                        type="url"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="/icons/icon-192x192.png"
                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                    <span className="text-sm font-medium text-zinc-300">Agendar envio</span>
                  </label>
                  
                  {isScheduled && (
                    <div className="mt-4">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 flex flex-col relative overflow-hidden">
                <h4 className="text-sm font-medium text-zinc-400 mb-6 flex items-center gap-2">
                  <DeviceMobile className="w-5 h-5" />
                  Preview da Mensagem
                </h4>

                <div className="flex-1 flex items-center justify-center p-4">
                  {/* Push Preview */}
                  {channel === 'push' && (
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 animate-in fade-in zoom-in duration-300">
                      <div className="flex gap-4 items-start">
                        <img src={icon || '/icons/icon-192x192.png'} alt="Icon" className="w-12 h-12 rounded-lg object-cover bg-gray-100" onError={(e) => { e.currentTarget.src = '/icons/icon-192x192.png' }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{title || 'Título da Notificação'}</p>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-3">{message || 'Mensagem da notificação vai aparecer aqui e poderá ocupar algumas linhas dependendo do conteúdo e do dispositivo do usuário.'}</p>
                          <p className="text-xs text-gray-400 mt-2 font-medium">economizei.ftech-apps.com.br</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Telegram Preview */}
                  {channel === 'telegram' && (
                    <div className="bg-[#182533] w-full max-w-sm rounded-xl p-4 relative overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300 border border-[#2b3a4a]">
                      <div className="bg-[#2b5278] rounded-2xl rounded-tl-none p-3 max-w-[90%] text-white text-sm shadow-md">
                        <p className="font-bold mb-1">{title || 'Título da Mensagem'}</p>
                        <p className="whitespace-pre-wrap">{message || 'A mensagem enviada para o canal do Telegram aparecerá neste formato balão...'}</p>
                        <span className="text-[10px] text-blue-200/60 block mt-2 text-right">10:42</span>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Preview */}
                  {channel === 'whatsapp' && (
                    <div className="bg-[#EFEAE2] w-full max-w-sm rounded-xl p-4 relative overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300">
                      {/* WhatsApp background pattern simulation */}
                      <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")' }}></div>
                      
                      <div className="relative bg-[#D9FDD3] rounded-lg rounded-tl-none p-2.5 max-w-[90%] text-[#111B21] text-sm shadow-sm border border-[#c2efbc]">
                        <p className="font-bold mb-1">*{title || 'Título da Mensagem'}*</p>
                        <p className="whitespace-pre-wrap">{message || 'A mensagem do WhatsApp será formatada e enviada para o grupo/canal cadastrado na API de integração.'}</p>
                        <span className="text-[10px] text-gray-500 block mt-1.5 text-right">10:42</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-3 justify-end rounded-b-2xl">
              <button 
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-zinc-300 hover:text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Salvar Rascunho
              </button>
              <button 
                onClick={() => handleSave(true)}
                disabled={saving || (isScheduled && !!scheduledAt)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <PaperPlaneTilt weight="bold" className="w-4 h-4" />
                Salvar e Enviar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Envio */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowConfirm(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-5 text-amber-400">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <WarningCircle weight="fill" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Confirmar Envio</h3>
                <p className="text-sm text-zinc-400">Você está prestes a disparar uma campanha.</p>
              </div>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-zinc-200 mb-1">{showConfirm.title}</p>
              <p className="text-xs text-zinc-500 capitalize">Canal: {showConfirm.channel}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
              <button
                onClick={() => handleSendNow(showConfirm.id)}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {saving ? 'Enviando...' : 'Confirmar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
