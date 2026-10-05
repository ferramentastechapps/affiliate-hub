'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilmStrip, Trash, ArrowCounterClockwise, Link as LinkIcon } from '@phosphor-icons/react';

type ReelProduct = {
  id: string;
  name: string;
  imageUrl: string;
  price: number | null;
  platformType: string;
  createdAt: string;
  productLinks: { affiliateUrl: string }[];
};

export function ReelsTab() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reels, setReels] = useState<ReelProduct[]>([]);
  const [fetching, setFetching] = useState(true);

  const loadReels = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/products?filter=reels&limit=100');
      const data = await res.json();
      setReels(Array.isArray(data) ? data : (data.products ?? []));
    } catch {
      // silencioso
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadReels(); }, [loadReels]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/reels/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao importar produto.');
      } else {
        setSuccess(`Produto "${data.product.name}" importado com sucesso!`);
        setUrl('');
        loadReels();
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remover produto dos Reels?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReel: false }),
      });
      if (res.ok) loadReels();
    } catch {
      alert('Erro ao remover.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Form de importação */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <FilmStrip weight="fill" className="text-indigo-400 w-5 h-5" />
          Importar link de afiliado para Reels
        </h2>
        <form onSubmit={handleImport} className="flex gap-3">
          <input
            type="url"
            placeholder="https://amzn.to/... ou link completo de afiliado"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
      </div>

      {/* Lista de reels */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">
            Produtos na aba Reels
            {!fetching && <span className="ml-2 text-xs text-zinc-500 font-normal">{reels.length} produto{reels.length !== 1 ? 's' : ''}</span>}
          </h2>
          <button onClick={loadReels} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowCounterClockwise className="w-4 h-4" />
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : reels.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Nenhum produto na aba Reels ainda.</div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {reels.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg shrink-0 bg-zinc-800" />
                ) : (
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-100 truncate font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.platformType}
                    {p.price != null && ` · R$ ${p.price.toFixed(2)}`}
                    {' · '}
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {p.productLinks[0]?.affiliateUrl && (
                  <a
                    href={p.productLinks[0].affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-indigo-400 transition-colors"
                    title="Abrir link de afiliado"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleRemove(p.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  title="Remover dos Reels"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
