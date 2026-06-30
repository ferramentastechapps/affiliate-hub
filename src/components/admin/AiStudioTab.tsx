"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star, Trash, Plus, Copy, Check, ArrowClockwise, Lightning,
  BookmarksSimple, Prohibit, ArrowsLeftRight, CalendarBlank, Eye, Package, Coin
} from "@phosphor-icons/react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Caption = {
  id: string; productId?: string | null; productName: string; caption: string;
  score?: number | null; rating?: number | null; ratedAt?: string | null;
  usedAsExample: boolean; createdAt: string; imageUrl?: string | null;
};
type BannedWord = { id: string; word: string; reason?: string | null; createdAt: string; };
type Substitution = { id: string; fromWord: string; toWord: string; createdAt: string; };
type AiContext = {
  id: string; title: string; description: string; isActive: boolean;
  startsAt?: string | null; endsAt?: string | null; createdAt: string;
};

type SubTab = 'captions' | 'products' | 'banned' | 'substitutions' | 'contexts' | 'tokens';
type RatingFilter = 'all' | 'unrated' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | '1' | 'examples';

// ─── StarRating ────────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value?: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={18}
            weight={(hovered || value || 0) >= n ? "fill" : "regular"}
            className={(hovered || value || 0) >= n ? "text-amber-400" : "text-zinc-600"}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Section A: Captions ───────────────────────────────────────────────────────
function CaptionsSection() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<RatingFilter>('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCaptions = useCallback(async () => {
    setLoading(true);
    try {
      const ratingParam = filter === 'all' ? '' : `&rating=${filter}`;
      const res = await fetch(`/api/admin/ai-studio/captions?page=${page}&limit=25${ratingParam}`);
      const data = await res.json();
      setCaptions(data.captions || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchCaptions(); }, [fetchCaptions]);

  async function handleRate(id: string, rating: number) {
    setSavingId(id);
    try {
      await fetch(`/api/admin/ai-studio/captions/${id}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      setCaptions(prev => prev.map(c => c.id === id ? { ...c, rating, ratedAt: new Date().toISOString() } : c));
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleExample(id: string, current: boolean) {
    setSavingId(id);
    try {
      await fetch(`/api/admin/ai-studio/captions/${id}/example`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usedAsExample: !current }),
      });
      setCaptions(prev => prev.map(c => c.id === id ? { ...c, usedAsExample: !current } : c));
    } finally {
      setSavingId(null);
    }
  }

  const ratingFilters: { value: RatingFilter; label: string }[] = [
    { value: 'all', label: `Todas (${total})` },
    { value: 'unrated', label: '⬜ Sem nota' },
    { value: 'examples', label: '✨ Exemplos' },
    { value: '10', label: '10' },
    { value: '9', label: '9' },
    { value: '8', label: '8' },
    { value: '7', label: '7' },
    { value: '6', label: '6' },
    { value: '5', label: '5' },
    { value: '4', label: '4' },
    { value: '3', label: '3' },
    { value: '2', label: '2' },
    { value: '1', label: '1' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {ratingFilters.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value ? 'bg-accent text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={fetchCaptions} className="ml-auto p-1.5 text-zinc-500 hover:text-white">
          <ArrowClockwise size={16} />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Carregando legendas...</div>
      ) : captions.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">Nenhuma legenda encontrada.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className={`p-4 rounded-xl border transition-colors ${
                caption.usedAsExample
                  ? 'bg-amber-950/20 border-amber-800/40'
                  : 'bg-zinc-900/60 border-zinc-800/40'
              }`}
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex gap-4 min-w-0 flex-1">
                  {caption.imageUrl && (
                    <img 
                      src={caption.imageUrl} 
                      alt="Product" 
                      className="w-16 h-16 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-500 mb-0.5 truncate">{caption.productName}</div>
                    <div className="font-bold text-lg text-white tracking-wide leading-tight break-words">
                      {caption.caption}
                    </div>
                  <div className="flex items-center gap-3 mt-1">
                    {caption.score !== null && caption.score !== undefined && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        caption.score >= 8 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                        : caption.score >= 5 ? 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'
                      }`}>
                        Score IA: {caption.score.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600">
                      {new Date(caption.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {caption.usedAsExample && (
                    <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full font-medium">
                      ✨ Exemplo
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleExample(caption.id, caption.usedAsExample)}
                    disabled={savingId === caption.id}
                    title={caption.usedAsExample ? 'Remover dos exemplos' : 'Marcar como exemplo para a IA'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      caption.usedAsExample
                        ? 'bg-amber-900/30 border-amber-800/50 text-amber-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/50'
                        : 'bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-amber-400 hover:border-amber-800/50'
                    }`}
                  >
                    <BookmarksSimple size={14} weight={caption.usedAsExample ? 'fill' : 'regular'} />
                  </button>
                </div>
              </div>
              {/* Rating */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500">Sua nota:</span>
                <StarRating value={caption.rating} onChange={(r) => handleRate(caption.id, r)} />
                {caption.ratedAt && (
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    avaliada em {new Date(caption.ratedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > 25 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-zinc-400">Pág. {page} de {Math.ceil(total / 25)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 25)}
            className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section B: Banned Words ───────────────────────────────────────────────────
function BannedWordsSection() {
  const [words, setWords] = useState<BannedWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/admin/ai-studio/banned-words')
      .then(r => r.json())
      .then(setWords)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newWord.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/ai-studio/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: newWord.trim(), reason: newReason.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setWords(prev => [data.banned, ...prev]);
        setNewWord('');
        setNewReason('');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao adicionar palavra');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/ai-studio/banned-words/${id}`, { method: 'DELETE' });
    setWords(prev => prev.filter(w => w.id !== id));
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-5">
        Palavras que a IA <strong className="text-red-400">nunca</strong> poderá usar nas legendas geradas.
        São injetadas no prompt como regra absoluta.
      </p>

      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Palavra proibida..."
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-red-700 outline-none"
        />
        <input
          type="text"
          placeholder="Motivo (opcional)"
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          className="w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-red-700 outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newWord.trim()}
          className="flex items-center gap-2 bg-red-900/40 hover:bg-red-800/60 border border-red-800/50 text-red-400 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
        >
          <Prohibit size={16} weight="bold" />
          Bloquear
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-zinc-500 text-center py-8">Carregando...</div>
      ) : words.length === 0 ? (
        <div className="text-zinc-500 text-center py-8 text-sm">Nenhuma palavra bloqueada ainda.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {words.map(w => (
            <div
              key={w.id}
              className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 text-red-400 px-3 py-1.5 rounded-full text-sm group"
              title={w.reason || ''}
            >
              <span className="font-mono font-bold">{w.word}</span>
              {w.reason && <span className="text-[10px] text-red-500/60 max-w-[120px] truncate">{w.reason}</span>}
              <button
                onClick={() => handleDelete(w.id)}
                className="text-red-600 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              >
                <Trash size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section C: Substitutions ──────────────────────────────────────────────────
function SubstitutionsSection() {
  const [subs, setSubs] = useState<Substitution[]>([]);
  const [fromWord, setFromWord] = useState('');
  const [toWord, setToWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/admin/ai-studio/substitutions')
      .then(r => r.json())
      .then(setSubs)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!fromWord.trim() || !toWord.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/ai-studio/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWord: fromWord.trim(), toWord: toWord.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubs(prev => [data.sub, ...prev]);
        setFromWord(''); setToWord('');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao adicionar substituição');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/ai-studio/substitutions/${id}`, { method: 'DELETE' });
    setSubs(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-5">
        Substituições aplicadas <strong className="text-purple-400">depois</strong> da IA gerar a legenda, antes de salvar.
        Útil para corrigir gírias, ortografia ou preferências de estilo.
      </p>

      {/* Add form */}
      <div className="flex gap-2 mb-6 items-center">
        <input
          type="text"
          placeholder="De (ex: nenem)"
          value={fromWord}
          onChange={e => setFromWord(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-purple-700 outline-none font-mono"
        />
        <ArrowsLeftRight size={18} className="text-zinc-500 shrink-0" />
        <input
          type="text"
          placeholder="Para (ex: bebê)"
          value={toWord}
          onChange={e => setToWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-purple-700 outline-none font-mono"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !fromWord.trim() || !toWord.trim()}
          className="flex items-center gap-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-800/50 text-purple-400 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
        >
          <Plus size={16} weight="bold" />
          Adicionar
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-zinc-500 text-center py-8">Carregando...</div>
      ) : subs.length === 0 ? (
        <div className="text-zinc-500 text-center py-8 text-sm">Nenhuma substituição cadastrada ainda.</div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">De</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">→ Para</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Adicionado</th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => (
                <tr key={s.id} className={`border-t border-zinc-800/50 ${i % 2 === 0 ? 'bg-zinc-900/30' : ''}`}>
                  <td className="px-4 py-3 font-mono text-red-400">{s.fromWord}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400">{s.toWord}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section D: Contexts ───────────────────────────────────────────────────────
function ContextsSection() {
  const [contexts, setContexts] = useState<AiContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startsAt: '', endsAt: '' });

  useEffect(() => {
    fetch('/api/admin/ai-studio/contexts')
      .then(r => r.json())
      .then(setContexts)
      .finally(() => setLoading(false));
  }, []);

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/ai-studio/preview-prompt');
      const data = await res.json();
      setPreviewPrompt(data.prompt || '');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleAdd() {
    if (!form.title.trim() || !form.description.trim()) return;
    const res = await fetch('/api/admin/ai-studio/contexts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setContexts(prev => [data.context, ...prev]);
      setForm({ title: '', description: '', startsAt: '', endsAt: '' });
      setShowAdd(false);
    }
  }

  async function handleToggleActive(ctx: AiContext) {
    const res = await fetch(`/api/admin/ai-studio/contexts/${ctx.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ctx.isActive }),
    });
    if (res.ok) {
      setContexts(prev => prev.map(c => c.id === ctx.id ? { ...c, isActive: !ctx.isActive } : c));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este contexto?')) return;
    await fetch(`/api/admin/ai-studio/contexts/${id}`, { method: 'DELETE' });
    setContexts(prev => prev.filter(c => c.id !== id));
  }

  async function handleCopy() {
    if (!previewPrompt) return;
    await navigator.clipboard.writeText(previewPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const now = new Date();
  function isCurrentlyActive(ctx: AiContext): boolean {
    if (!ctx.isActive) return false;
    if (ctx.startsAt && new Date(ctx.startsAt) > now) return false;
    if (ctx.endsAt && new Date(ctx.endsAt) < now) return false;
    return true;
  }

  return (
    <div className="space-y-6">
      {/* Contextos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Eventos / Contextos</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {showAdd && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Título (ex: Dia dos Pais 2026)"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none"
            />
            <textarea
              placeholder="Descrição (injetada no prompt da IA. Ex: Use referências ao dia dos pais, presentes, família...)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none resize-none"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Início (opcional)</label>
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Fim (opcional)</label>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button
                onClick={handleAdd}
                disabled={!form.title.trim() || !form.description.trim()}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/90 text-black rounded-lg font-medium disabled:opacity-40 transition-colors"
              >
                Salvar Contexto
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-center py-8">Carregando...</div>
        ) : contexts.length === 0 ? (
          <div className="text-zinc-500 text-center py-8 text-sm">Nenhum contexto cadastrado.</div>
        ) : (
          <div className="space-y-3">
            {contexts.map(ctx => {
              const active = isCurrentlyActive(ctx);
              return (
                <div
                  key={ctx.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    active
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-zinc-900/60 border-zinc-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">{ctx.title}</span>
                        {active ? (
                          <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">✅ Ativo agora</span>
                        ) : (
                          <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2 py-0.5 rounded-full">{ctx.isActive ? '⏰ Fora do período' : '⏸ Pausado'}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{ctx.description}</p>
                      {(ctx.startsAt || ctx.endsAt) && (
                        <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-500">
                          {ctx.startsAt && <span>Início: {new Date(ctx.startsAt).toLocaleDateString('pt-BR')}</span>}
                          {ctx.endsAt && <span>Fim: {new Date(ctx.endsAt).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleActive(ctx)}
                        title={ctx.isActive ? 'Pausar' : 'Ativar'}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          ctx.isActive
                            ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/50'
                            : 'bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:text-emerald-400 hover:border-emerald-800/50'
                        }`}
                      >
                        {ctx.isActive ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => handleDelete(ctx.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview do Prompt */}
      <div className="border-t border-zinc-800 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Eye size={16} className="text-accent" />
              Preview do Prompt Completo
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">O prompt exato que a IA recebe agora, com exemplos, palavras bloqueadas e contextos ativos.</p>
          </div>
          <div className="flex gap-2">
            {previewPrompt && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            )}
            <button
              onClick={loadPreview}
              disabled={loadingPreview}
              className="flex items-center gap-1.5 text-xs bg-accent hover:bg-accent/90 text-black px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {loadingPreview ? <ArrowClockwise size={14} className="animate-spin" /> : <Lightning size={14} />}
              {previewPrompt ? 'Atualizar' : 'Ver Prompt'}
            </button>
          </div>
        </div>

        {previewPrompt && (
          <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap font-mono">
            {previewPrompt}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Section E: Products Rating ───────────────────────────────────────────────
type ScrapedProduct = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price: number | null;
  storeName: string | null;
  aiScore: number | null;
  aiAnalysis: string | null;
  userRating: number | null;
  createdAt: string;
};

function ProductsSection() {
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unrated' | 'rated'>('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/scraped?page=${page}&limit=20&rating=${filter}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleRate(id: string, rating: number) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRating: rating }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, userRating: rating } : p));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex gap-2">
          {(['all', 'unrated', 'rated'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900/50 text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {f === 'all' && 'Todos'}
              {f === 'unrated' && 'Não avaliados'}
              {f === 'rated' && 'Avaliados'}
            </button>
          ))}
        </div>
        <div className="text-xs text-zinc-500 font-medium">
          {total} produtos encontrados
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          Nenhum produto encontrado com este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((p) => {
            let aiCritique = '';
            if (p.aiAnalysis) {
              try {
                const parsed = JSON.parse(p.aiAnalysis);
                aiCritique = parsed.analise || parsed.critique || p.aiAnalysis;
              } catch {
                aiCritique = p.aiAnalysis;
              }
            }

            return (
              <div key={p.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex gap-4 hover:border-zinc-700/60 transition-colors">
                {/* Imagem */}
                <div className="w-20 h-20 bg-zinc-950 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-zinc-800">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-semibold text-sm text-zinc-200 line-clamp-1" title={p.name}>
                      {p.name}
                    </h4>
                    <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      R$ {p.price ? p.price.toFixed(2) : '—'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>Loja: <strong className="text-zinc-400">{p.storeName || '—'}</strong></span>
                    <span>•</span>
                    <span>Categoria: <strong className="text-zinc-400">{p.category}</strong></span>
                    <span>•</span>
                    <span>Achado em: <strong className="text-zinc-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                  </div>

                  {/* Detalhes da IA */}
                  <div className="mt-2 bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-2.5 text-xs flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-400">Pontuação IA:</span>
                      <span className={`font-extrabold ${
                        (p.aiScore || 0) >= 8 ? 'text-emerald-400' :
                        (p.aiScore || 0) >= 6 ? 'text-yellow-400' : 'text-zinc-500'
                      }`}>
                        {p.aiScore !== null ? `${p.aiScore.toFixed(1)}/10` : 'Pendente'}
                      </span>
                    </div>
                    {aiCritique && (
                      <p className="text-zinc-500 italic">
                        &ldquo;{aiCritique}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Avaliação do Admin */}
                <div className="flex flex-col items-end justify-center shrink-0 pl-4 border-l border-zinc-800/80 min-w-[160px] gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sua nota para o produto</span>
                  <div className="relative">
                    <StarRating
                      value={p.userRating}
                      onChange={(rating) => handleRate(p.id, rating)}
                    />
                    {savingId === p.id && (
                      <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center rounded">
                        <ArrowClockwise size={14} className="animate-spin text-accent" />
                      </div>
                    )}
                  </div>
                  {p.userRating && (
                    <span className="text-[10px] text-emerald-400 font-medium">Nota {p.userRating}/10 salva</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
          >
            Anterior
          </button>
          <span className="px-3 py-1.5 text-xs text-zinc-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AiStudioTab (Main) ────────────────────────────────────────────────────────
export function AiStudioTab() {
  const [subTab, setSubTab] = useState<SubTab>('captions');

  const subTabs: { value: SubTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'captions', label: '⭐ Legendas', icon: <Star size={16} />, desc: 'Avalie as legendas geradas e ensine a IA' },
    { value: 'products', label: '🏷️ Produtos', icon: <Package size={16} />, desc: 'Avalie os produtos encontrados e refine o direcionamento da IA' },
    { value: 'banned', label: '🚫 Bloqueadas', icon: <Prohibit size={16} />, desc: 'Palavras que a IA nunca deve usar' },
    { value: 'substitutions', label: '🔄 Substituições', icon: <ArrowsLeftRight size={16} />, desc: 'Corrija palavras no pós-processamento' },
    { value: 'contexts', label: '📅 Contextos', icon: <CalendarBlank size={16} />, desc: 'Eventos e contextos temporais + preview do prompt' },
    { value: 'tokens', label: '🪙 Tokens & Custos', icon: <Coin size={16} />, desc: 'Monitore o uso e os custos estimados da IA' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          🧠 IA Criativa
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Treine, corrija e controle como a IA gera as legendas dos produtos.
        </p>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4 flex-wrap">
        {subTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSubTab(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              subTab === tab.value
                ? 'bg-zinc-800 text-accent border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Descrição da sub-aba */}
      <div className="mb-5 text-xs text-zinc-500 flex items-center gap-2">
        <Lightning size={12} className="text-accent" />
        {subTabs.find(t => t.value === subTab)?.desc}
      </div>

      {/* Conteúdo */}
      {subTab === 'captions' && <CaptionsSection />}
      {subTab === 'products' && <ProductsSection />}
      {subTab === 'banned' && <BannedWordsSection />}
      {subTab === 'substitutions' && <SubstitutionsSection />}
      {subTab === 'contexts' && <ContextsSection />}
      {subTab === 'tokens' && <TokensSection />}
    </div>
  );
}

// ─── Section G: Tokens ───────────────────────────────────────────────────────
function TokensSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/tokens?period=${period}`)
      .then(res => res.json())
      .then(json => setData(json.data))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="p-8 text-center text-zinc-400">Carregando métricas de IA...</div>;
  if (!data) return <div className="p-8 text-center text-red-400">Erro ao carregar métricas.</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['7d', '30d', '90d'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${period === p ? 'bg-accent text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            {p === '7d' ? 'Últimos 7 dias' : p === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-zinc-400 text-sm">Total de Chamadas</span>
          <p className="text-3xl font-bold text-white mt-2">{data.totalCalls?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-zinc-400 text-sm">Tokens Processados</span>
          <p className="text-3xl font-bold text-accent mt-2">{data.totalTokens?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-zinc-400 text-sm">Custo Estimado</span>
          <p className="text-3xl font-bold text-green-400 mt-2">
            ${(data.totalCostUSD || 0).toFixed(4)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-zinc-100">Uso por Função</h3>
          <div className="space-y-3">
            {data.groupByFunction?.map((f: any) => (
              <div key={f.functionName} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                <span className="font-medium text-zinc-300">{f.functionName}</span>
                <div className="text-right text-xs">
                  <div className="text-zinc-400">{(f._sum.totalTokens || 0).toLocaleString()} tokens</div>
                  <div className="text-green-500 font-medium">${(f._sum.costUSD || 0).toFixed(4)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-zinc-100">Uso por Modelo</h3>
          <div className="space-y-3">
            {data.groupByModel?.map((m: any) => (
              <div key={m.modelUsed} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                <span className="font-medium text-zinc-300">{m.modelUsed}</span>
                <div className="text-right text-xs">
                  <div className="text-zinc-400">{(m._sum.totalTokens || 0).toLocaleString()} tokens</div>
                  <div className="text-green-500 font-medium">${(m._sum.costUSD || 0).toFixed(4)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
