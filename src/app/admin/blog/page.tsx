'use client';

import { useState, useEffect } from 'react';
import { Article, Sparkle, Trash, ArrowSquareOut, Clock, Eye, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: string | null;
  readTimeMinutes: number;
  publishedAt: string;
  views: number;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleGenerateNow = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Artigo gerado com sucesso: "${data.post.title}"!`,
        });
        await fetchPosts();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Falha ao gerar post automático.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Erro de rede ao conectar à API.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o artigo "${title}"?`)) return;

    try {
      const res = await fetch(`/api/blog?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
      } else {
        alert('Erro ao excluir artigo.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir.');
    }
  };

  return (
    <div className="space-y-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Article size={32} className="text-[#ff334b]" />
            Blog & Automação SEO / GEO
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Gerenciamento de artigos e acompanhamento do robô diário das 18h.
          </p>
        </div>

        <button
          onClick={handleGenerateNow}
          disabled={generating}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
            generating
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#ff334b] to-rose-600 text-white hover:opacity-95 hover:shadow-[#ff334b]/20 hover:scale-[1.02]'
          }`}
        >
          <Sparkle size={18} weight="fill" className={generating ? 'animate-spin' : ''} />
          {generating ? 'Pesquisando & Redigindo Artigo...' : '⚡ Gerar Post com IA Agora'}
        </button>
      </div>

      {/* ── FEEDBACK ALERT ── */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            Fechar
          </button>
        </div>
      )}

      {/* ── ROBÔ STATUS CARD ── */}
      <div className="p-6 rounded-3xl bg-[#13151f] border border-white/[0.08] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff334b]/10 border border-[#ff334b]/20 flex items-center justify-center text-[#ff334b] shrink-0">
              <Clock size={24} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Robô de Publicação Diária (18:00)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ativo no PM2
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                O serviço monitora notícias e produtos do site, gera comparativos no Gemini 2.5 Flash com diretrizes AEO/GEO e posta todo dia pontualmente às 18:00 (Brasília).
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-zinc-500">Horário configurado</div>
            <div className="text-xl font-black text-white">18:00 BRT</div>
          </div>
        </div>
      </div>

      {/* ── LISTA DE POSTS ── */}
      <div className="rounded-3xl bg-[#13151f] border border-white/[0.08] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Artigos Publicados
            <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
              {posts.length}
            </span>
          </h2>
          <button
            onClick={fetchPosts}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Atualizar lista
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            Carregando artigos...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            Nenhum artigo encontrado no banco. Clique em "Gerar Post com IA Agora" para criar o primeiro!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-[#0c0d14] border border-white/[0.04] hover:border-white/[0.1] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-zinc-900"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs shrink-0">
                      Sem foto
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-1">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-semibold">
                        {post.category}
                      </span>
                      <span>•</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{post.readTimeMinutes} min</span>
                    </div>
                    <h4 className="text-sm md:text-base font-bold text-white line-clamp-1">
                      {post.title}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-colors"
                    title="Ver no site"
                  >
                    <ArrowSquareOut size={18} />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Excluir artigo"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
