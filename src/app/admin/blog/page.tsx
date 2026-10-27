'use client';

import { useState, useEffect } from 'react';
import {
  Article,
  Sparkle,
  Trash,
  ArrowSquareOut,
  Clock,
  Image as ImageIcon,
  UploadSimple,
  X,
  FloppyDisk,
  Info,
  LinkSimple,
} from '@phosphor-icons/react';
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

  // Estados de edição de imagem
  const [editingPost, setEditingPost] = useState<BlogPostSummary | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingCover, setSavingCover] = useState(false);

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
        setPosts(posts.filter((p) => p.id !== id));
      } else {
        alert('Erro ao excluir artigo.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir.');
    }
  };

  const openEditModal = (post: BlogPostSummary) => {
    setEditingPost(post);
    setCoverUrl(post.coverImage || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setCoverUrl(data.imageUrl);
      } else {
        alert(data.error || 'Falha no upload da imagem.');
      }
    } catch (err: any) {
      alert('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCover = async () => {
    if (!editingPost) return;

    try {
      setSavingCover(true);
      const res = await fetch('/api/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPost.id,
          coverImage: coverUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(
          posts.map((p) => (p.id === editingPost.id ? { ...p, coverImage: coverUrl } : p))
        );
        setMessage({ type: 'success', text: 'Foto de capa atualizada com sucesso no blog e no site!' });
        setEditingPost(null);
      } else {
        alert(data.error || 'Erro ao salvar nova imagem.');
      }
    } catch (err: any) {
      alert('Erro de conexão ao salvar: ' + err.message);
    } finally {
      setSavingCover(false);
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
            Gerenciamento de artigos, fotos de capa e acompanhamento do robô diário das 18h.
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

      {/* ── GUIA DE DIMENSÕES DE FOTOS ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-[#13151f] to-indigo-950/30 border border-blue-500/20 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Info size={22} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Padrão de Dimensões para Fotos do Blog (SEO & Redes Sociais)
            </h3>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Para suas imagens ficarem perfeitas nos cards, no banner do artigo e serem indexadas no Google Discover / WhatsApp:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">📐 Resolução Ideal</div>
                <div className="text-base font-black text-white mt-0.5">1200 × 630 px</div>
                <div className="text-[11px] text-zinc-500">Proporção 1.91:1 (OpenGraph padrão)</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">🖥️ Resolução Alternativa</div>
                <div className="text-base font-black text-white mt-0.5">1280 × 720 px</div>
                <div className="text-[11px] text-zinc-500">Proporção 16:9 widescreen HD</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">📁 Formatos & Peso</div>
                <div className="text-base font-black text-white mt-0.5">WebP, PNG ou JPG</div>
                <div className="text-[11px] text-zinc-500">Até 5 MB (assunto centralizado)</div>
              </div>
            </div>
          </div>
        </div>
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
                O serviço monitora notícias e produtos do site, gera comparativos no Gemini com diretrizes AEO/GEO e posta todo dia pontualmente às 18:00 (Brasília).
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
                  <div className="relative group/thumb shrink-0">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-20 h-16 rounded-xl object-cover bg-zinc-900 border border-white/[0.08]"
                      />
                    ) : (
                      <div className="w-20 h-16 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs border border-white/[0.08]">
                        Sem foto
                      </div>
                    )}
                    <button
                      onClick={() => openEditModal(post)}
                      className="absolute inset-0 bg-black/70 rounded-xl opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-white transition-opacity"
                      title="Editar foto"
                    >
                      <ImageIcon size={16} />
                      Editar
                    </button>
                  </div>

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
                  <button
                    onClick={() => openEditModal(post)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff334b]/10 hover:bg-[#ff334b]/20 text-[#ff334b] text-xs font-bold transition-colors border border-[#ff334b]/20"
                    title="Editar foto de capa"
                  >
                    <ImageIcon size={16} weight="bold" />
                    <span>Alterar Foto</span>
                  </button>

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

      {/* ── MODAL DE EDIÇÃO DE FOTO ── */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#13151f] border border-white/[0.1] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ImageIcon size={22} className="text-[#ff334b]" weight="bold" />
                  Editar Foto de Capa
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                  {editingPost.title}
                </p>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guia Rápido de Dimensões */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <Info size={16} weight="bold" />
                Dimensões recomendadas para esta imagem:
              </div>
              <div className="text-zinc-300">
                • <strong>Tamanho ideal:</strong> 1200 × 630 px (proporção 1.91:1) ou 1280 × 720 px (16:9).
              </div>
              <div className="text-zinc-400">
                • Mantenha o conteúdo principal centralizado para não cortar nos cards do celular.
              </div>
            </div>

            {/* Preview da Imagem */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Pré-visualização da Capa
              </label>
              <div className="w-full h-52 rounded-2xl overflow-hidden bg-[#0c0d14] border border-white/[0.08] relative flex items-center justify-center">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Preview da capa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80';
                    }}
                  />
                ) : (
                  <span className="text-xs text-zinc-600">Nenhuma imagem selecionada</span>
                )}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 font-mono">
                  Aspecto 16:9
                </span>
              </div>
            </div>

            {/* Opções de Alteração: Upload ou URL */}
            <div className="space-y-4">
              {/* Opção 1: Upload de Arquivo */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Opção 1: Enviar arquivo do computador / celular
                </label>
                <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-[#ff334b]/50 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all">
                  <UploadSimple size={20} className="text-[#ff334b]" weight="bold" />
                  <span className="text-xs font-bold text-zinc-200">
                    {uploading ? 'Processando e otimizando imagem...' : 'Clique para selecionar imagem (WebP/JPG/PNG)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Opção 2: Inserir URL Direta */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Opção 2: Ou colar URL de imagem externa
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/50 border border-white/[0.08] focus-within:border-[#ff334b]/50">
                  <LinkSimple size={18} className="text-zinc-500 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... ou https://..."
                    className="w-full bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCover}
                disabled={savingCover || uploading || !coverUrl}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff334b] to-rose-600 text-white text-xs font-bold shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FloppyDisk size={16} weight="bold" />
                {savingCover ? 'Salvando...' : 'Salvar Nova Foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
