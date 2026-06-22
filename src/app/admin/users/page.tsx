'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  MagnifyingGlass,
  Plus,
  X,
  Check,
  UserCircle,
  Crown,
  ShieldCheck,
} from '@phosphor-icons/react';

interface UserTag {
  id: string;
  name: string;
  color: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  engagementScore: number;
  lastLoginAt: string | null;
  createdAt: string;
  tags: UserTag[];
  _count: { comments: number; votes: number; alerts: number };
}

interface RoleCounts {
  admin: number;
  moderator: number;
  user: number;
}

const ROLE_STYLES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Crown },
  moderator: { label: 'Moderador', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: ShieldCheck },
  user: { label: 'Usuário', cls: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30', icon: UserCircle },
};

function EngagementBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-zinc-600';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400">{pct}</span>
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({ admin: 0, moderator: 0, user: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [tagSaving, setTagSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sort });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!data.error) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setRoleCounts(data.roleCounts);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, sort]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: isActive ? 'DELETE' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: isActive ? undefined : JSON.stringify({ isActive: true }),
    });
    fetchUsers();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setTagSaving(true);
    await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    setTagSaving(false);
    setShowTagModal(false);
    setNewTagName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" weight="duotone" />
            Usuários & CRM
          </h1>
          <p className="text-zinc-400 mt-1">Gerencie usuários, tags e engajamento.</p>
        </div>
        <button
          onClick={() => setShowTagModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tag
        </button>
      </div>

      {/* Role Badges */}
      <div className="flex gap-3 flex-wrap">
        {[
          { role: 'admin', count: roleCounts.admin, icon: Crown, cls: 'bg-purple-500/10 border-purple-500/20 text-purple-300' },
          { role: 'moderator', count: roleCounts.moderator, icon: ShieldCheck, cls: 'bg-blue-500/10 border-blue-500/20 text-blue-300' },
          { role: 'user', count: roleCounts.user, icon: UserCircle, cls: 'bg-zinc-800 border-zinc-700 text-zinc-300' },
        ].map(({ role, count, icon: Icon, cls }) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${cls} ${roleFilter === role ? 'ring-2 ring-offset-2 ring-offset-zinc-950 ring-current' : 'opacity-80 hover:opacity-100'}`}
          >
            <Icon className="w-4 h-4" weight="duotone" />
            <span className="capitalize">{ROLE_STYLES[role].label}</span>
            <span className="ml-1 px-1.5 py-0.5 bg-black/20 rounded-md text-xs">{count}</span>
          </button>
        ))}
        <span className="text-zinc-500 text-sm self-center ml-2">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="createdAt">Mais recentes</option>
          <option value="engagementScore">Maior engajamento</option>
          <option value="lastLoginAt">Último acesso</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Engajamento</th>
                <th className="px-6 py-4 font-medium">Último acesso</th>
                <th className="px-6 py-4 font-medium">Status</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleInfo = ROLE_STYLES[user.role] || ROLE_STYLES.user;
                  const RoleIcon = roleInfo.icon;
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      {/* Avatar + Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-100">{user.name}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer bg-transparent focus:outline-none ${roleInfo.cls}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderador</option>
                          <option value="user">Usuário</option>
                        </select>
                      </td>

                      {/* Tags */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: tag.color + '33', color: tag.color, borderColor: tag.color + '55', borderWidth: 1 }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {user.tags.length > 3 && (
                            <span className="text-xs text-zinc-500">+{user.tags.length - 3}</span>
                          )}
                        </div>
                      </td>

                      {/* Engagement */}
                      <td className="px-6 py-4">
                        <EngagementBar score={user.engagementScore} />
                      </td>

                      {/* Last Login */}
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {formatDate(user.lastLoginAt)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            user.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                          }`}
                        >
                          {user.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20"
                        >
                          Ver perfil
                        </button>
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
              Página {page} de {totalPages} • {total} usuários
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

      {/* New Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTagModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-100">Nova Tag</h3>
              <button onClick={() => setShowTagModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Nome da tag</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="ex: VIP, Influencer..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ backgroundColor: newTagColor + '33', color: newTagColor, border: `1px solid ${newTagColor}55` }}
                  >
                    {newTagName || 'Preview'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCreateTag}
                disabled={tagSaving || !newTagName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {tagSaving ? 'Criando...' : 'Criar Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
