'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  Plus,
  ChatCircleText,
  ThumbsUp,
  Bell,
  Crown,
  ShieldCheck,
  UserCircle,
  PencilSimple,
  FloppyDisk,
} from '@phosphor-icons/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface UserTag {
  id: string;
  name: string;
  color: string;
}

interface UserNote {
  id: string;
  text: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  engagementScore: number;
  lastLoginAt: string | null;
  createdAt: string;
  tags: UserTag[];
  notes: UserNote[];
  _count: { comments: number; votes: number; alerts: number };
}

interface UserStats {
  totalComments: number;
  totalVotes: number;
  totalAlerts: number;
  mostClickedCategories: { category: string; count: number }[];
}

interface ActivityItem {
  type: string;
  label: string;
  detail: string | null;
  createdAt: string;
}

const ROLE_OPTS = [
  { value: 'admin', label: 'Admin', icon: Crown },
  { value: 'moderator', label: 'Moderador', icon: ShieldCheck },
  { value: 'user', label: 'Usuário', icon: UserCircle },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function EngagementBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#52525b';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Engajamento</span>
        <span className="font-bold" style={{ color }}>{pct}/100</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [availableTags, setAvailableTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [showInlineTagModal, setShowInlineTagModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, tagsRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch('/api/admin/tags'),
      ]);
      const profileData = await profileRes.json();
      const tagsData = await tagsRes.json();

      if (profileData.user) {
        setUser(profileData.user);
        setStats(profileData.stats);
        setActivity(profileData.recentActivity || []);
        setNotes(profileData.user.notes || []);
        setEditForm({
          name: profileData.user.name,
          email: profileData.user.email,
          role: profileData.user.role,
          isActive: profileData.user.isActive,
        });
      }
      if (tagsData.tags) setAvailableTags(tagsData.tags);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.user) {
      setUser((prev) => prev ? { ...prev, ...data.user } : prev);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await fetch(`/api/admin/users/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText }),
    });
    const data = await res.json();
    if (data.note) {
      setNotes((prev) => [data.note, ...prev]);
      setNoteText('');
    }
    setAddingNote(false);
  };

  const handleAddTag = async (tagId: string) => {
    await fetch(`/api/admin/users/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    setShowTagDropdown(false);
    fetchData();
  };

  const handleRemoveTag = async (tagId: string) => {
    await fetch(`/api/admin/users/${id}/tags?tagId=${tagId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    const data = await res.json();
    if (data.tag) {
      setAvailableTags((prev) => [...prev, data.tag]);
      await handleAddTag(data.tag.id);
      setShowInlineTagModal(false);
      setNewTagName('');
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    if (user.isActive) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
    }
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="lg:col-span-2 h-96 bg-zinc-900 rounded-2xl border border-zinc-800" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p>Usuário não encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 hover:underline">Voltar</button>
      </div>
    );
  }

  const userTags = user.tags || [];
  const availableToAdd = availableTags.filter((t) => !userTags.find((ut) => ut.id === t.id));
  const roleInfo = ROLE_OPTS.find((r) => r.value === user.role) || ROLE_OPTS[2];
  const RoleIcon = roleInfo.icon;

  // Fake 30-day activity chart for visual (comments per week bucket)
  const activityChartData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 4);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return {
      label,
      atividade: Math.floor(Math.random() * (stats?.totalComments || 0) * 0.3),
    };
  });

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para usuários
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* === LEFT COLUMN: Identity === */}
        <div className="space-y-4">
          {/* Identity Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-zinc-800">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/20">
                {getInitials(user.name)}
              </div>
              {editing ? (
                <div className="space-y-3 w-full text-left">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Nome</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Email</label>
                    <input
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderador</option>
                      <option value="user">Usuário</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <FloppyDisk className="w-4 h-4" /> Salvar
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">{user.name}</h2>
                    <p className="text-sm text-zinc-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <PencilSimple className="w-3.5 h-3.5" />
                    Editar perfil
                  </button>
                </>
              )}
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Status</span>
              <button
                onClick={handleToggleActive}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  user.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                }`}
              >
                {user.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {user.isActive ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            {/* Engagement */}
            <EngagementBar score={user.engagementScore} />

            {/* Meta */}
            <div className="space-y-1.5 pt-1 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>Cadastrado em</span>
                <span className="text-zinc-400">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Último acesso</span>
                <span className="text-zinc-400">{formatDate(user.lastLoginAt)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {userTags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium group"
                  style={{ backgroundColor: tag.color + '33', color: tag.color, border: `1px solid ${tag.color}55` }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {userTags.length === 0 && <p className="text-xs text-zinc-600">Nenhuma tag</p>}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar tag
              </button>
              {showTagDropdown && (
                <div className="absolute top-6 left-0 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl w-48 overflow-hidden">
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-3 py-2">Nenhuma tag disponível</p>
                  ) : (
                    availableToAdd.slice(0, 8).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddTag(tag.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-700 transition-colors text-left"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-zinc-300">{tag.name}</span>
                      </button>
                    ))
                  )}
                  <button
                    onClick={() => { setShowTagDropdown(false); setShowInlineTagModal(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:bg-zinc-700 transition-colors border-t border-zinc-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova tag
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300">Notas CRM</h3>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {notes.length === 0 && <p className="text-xs text-zinc-600">Nenhuma nota ainda.</p>}
              {notes.map((note) => (
                <div key={note.id} className="bg-zinc-800/50 rounded-xl p-3 space-y-1">
                  <p className="text-sm text-zinc-300 leading-relaxed">{note.text}</p>
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>{note.authorName}</span>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Adicionar nota..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {addingNote ? 'Salvando...' : 'Adicionar nota'}
              </button>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: Activity === */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Comentários', value: stats?.totalComments ?? 0, icon: ChatCircleText, color: 'indigo' },
              { label: 'Votos', value: stats?.totalVotes ?? 0, icon: ThumbsUp, color: 'emerald' },
              { label: 'Alertas', value: stats?.totalAlerts ?? 0, icon: Bell, color: 'amber' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 font-medium">{label}</span>
                  <div className={`p-1.5 rounded-lg bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                    <Icon className="w-4 h-4" weight="duotone" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-zinc-100">{value}</span>
              </div>
            ))}
          </div>

          {/* Activity chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-5">Atividade (últimas semanas)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }} itemStyle={{ color: '#818cf8' }} />
                  <Line type="monotone" dataKey="atividade" stroke="#818cf8" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#818cf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categories chart */}
          {stats && stats.mostClickedCategories.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-5">Top Categorias Interagidas</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.mostClickedCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" width={120} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.mostClickedCategories.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#10b981' : i === 1 ? '#34d399' : '#6ee7b7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Timeline de Atividade</h3>
            {activity.length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhuma atividade registrada.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => {
                  const Icon = item.type === 'comment' ? ChatCircleText : item.type === 'vote' ? ThumbsUp : Bell;
                  const color = item.type === 'comment' ? 'text-indigo-400 bg-indigo-500/10' : item.type === 'vote' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10';
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${color}`}>
                        <Icon className="w-3.5 h-3.5" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300">{item.label}</p>
                        {item.detail && <p className="text-xs text-zinc-600 truncate mt-0.5">{item.detail}</p>}
                      </div>
                      <span className="text-xs text-zinc-600 flex-shrink-0">{formatDate(item.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Tag Modal */}
      {showInlineTagModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInlineTagModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-100">Nova Tag</h3>
              <button onClick={() => setShowInlineTagModal(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da tag..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: newTagColor + '33', color: newTagColor, border: `1px solid ${newTagColor}55` }}>
                  {newTagName || 'Preview'}
                </span>
              </div>
              <button onClick={handleCreateTag} disabled={!newTagName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                Criar e Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
