'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChatCircleText, MagnifyingGlass, Trash, X, ArrowSquareOut } from '@phosphor-icons/react';
import Link from 'next/link';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  guestName: string | null;
  user: { id: string; name: string; email: string } | null;
  product: { id: string; name: string; shortId: number };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/admin/comments?${params}`);
      const data = await res.json();
      if (!data.error) {
        setComments(data.comments);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/comments?id=${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    setDeleteTarget(null);
    fetchComments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <ChatCircleText className="w-8 h-8 text-orange-400" weight="duotone" />
            Moderação de Comentários
          </h1>
          <p className="text-zinc-400 mt-1">
            <span className="text-zinc-200 font-semibold">{total}</span> comentários no total
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar comentários, usuários ou produtos..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Comentário</th>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum comentário encontrado.
                  </td>
                </tr>
              ) : (
                comments.map((comment) => (
                  <tr key={comment.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-zinc-300 text-sm line-clamp-2">{comment.text.substring(0, 120)}{comment.text.length > 120 ? '...' : ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      {comment.user ? (
                        <div>
                          <p className="text-zinc-200 font-medium text-sm">{comment.user.name}</p>
                          <p className="text-xs text-zinc-500">{comment.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs">{comment.guestName || 'Anônimo'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-300 text-sm line-clamp-1 max-w-36">{comment.product.name}</span>
                        <Link
                          href={`/produto/${comment.product.shortId}`}
                          target="_blank"
                          className="text-zinc-500 hover:text-indigo-400 transition-colors flex-shrink-0"
                        >
                          <ArrowSquareOut className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDate(comment.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDeleteTarget(comment)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <span className="text-sm text-zinc-500">Página {page} de {totalPages} • {total} comentários</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-100">Confirmar exclusão</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 mb-5">
              <p className="text-sm text-zinc-300 italic">"{deleteTarget.text.substring(0, 150)}{deleteTarget.text.length > 150 ? '...' : ''}"</p>
              <p className="text-xs text-zinc-500 mt-2">por {deleteTarget.user?.name || deleteTarget.guestName || 'Anônimo'} em {deleteTarget.product.name}</p>
            </div>
            <p className="text-sm text-zinc-400 mb-5">Esta ação não pode ser desfeita. O comentário será permanentemente removido.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash className="w-4 h-4" />
                {deleting ? 'Deletando...' : 'Deletar comentário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
