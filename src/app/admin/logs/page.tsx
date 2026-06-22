'use client';

import { useEffect, useState, useCallback } from 'react';
import { ListChecks, MagnifyingGlass, Package, Users, ChatCircleText, Ticket, Image, ArrowSquareOut } from '@phosphor-icons/react';
import Link from 'next/link';

interface LogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  'product': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  'user': 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  'comment': 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  'coupon': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  'banner': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  'bot': 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  'notification': 'bg-teal-500/15 text-teal-300 border-teal-500/25',
  'default': 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  product: Package,
  user: Users,
  comment: ChatCircleText,
  coupon: Ticket,
  banner: Image,
};

function getActionColor(action: string) {
  const prefix = action.split('.')[0];
  return ACTION_COLORS[prefix] || ACTION_COLORS.default;
}

function getActionIcon(action: string) {
  const prefix = action.split('.')[0];
  return ENTITY_ICONS[prefix] || ListChecks;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [distinctActions, setDistinctActions] = useState<string[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (actionFilter) params.set('action', actionFilter);
    if (adminFilter) params.set('userId', adminFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (!data.error) {
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.admins?.length) setAdmins(data.admins);
        if (data.distinctActions?.length) setDistinctActions(data.distinctActions);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, adminFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <ListChecks className="w-8 h-8 text-violet-400" weight="duotone" />
          Audit Trail / Logs
        </h1>
        <p className="text-zinc-400 mt-1">Histórico de ações administrativas. <span className="text-zinc-200 font-semibold">{total}</span> registros.</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">Todas as ações</option>
          {distinctActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={adminFilter}
          onChange={(e) => { setAdminFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">Todos os admins</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          placeholder="De"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          placeholder="Até"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Ação</th>
                <th className="px-6 py-4 font-medium">Admin</th>
                <th className="px-6 py-4 font-medium">Entidade</th>
                <th className="px-6 py-4 font-medium">Detalhes</th>
                <th className="px-6 py-4 font-medium">IP</th>
                <th className="px-6 py-4 font-medium">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Nenhum log encontrado.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const actionColor = getActionColor(log.action);
                  const entityPrefix = log.entityType;
                  const entityLink = entityPrefix === 'product' && log.entityId
                    ? `/admin/products`
                    : entityPrefix === 'user' && log.entityId
                    ? `/admin/users/${log.entityId}`
                    : null;

                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                      {/* Action */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${actionColor}`}>
                            <ActionIcon className="w-3.5 h-3.5" weight="duotone" />
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${actionColor}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Admin */}
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div>
                            <p className="text-zinc-200 font-medium text-sm">{log.user.name}</p>
                            <p className="text-xs text-zinc-500">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">Sistema</span>
                        )}
                      </td>

                      {/* Entity */}
                      <td className="px-6 py-4">
                        {log.entityId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 text-xs font-mono">{log.entityType}/{log.entityId.slice(-6)}</span>
                            {entityLink && (
                              <Link href={entityLink} className="text-zinc-500 hover:text-indigo-400 transition-colors">
                                <ArrowSquareOut className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">{log.entityType}</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4 max-w-xs">
                        {log.details ? (
                          <p className="text-xs text-zinc-500 font-mono truncate max-w-48">
                            {typeof log.details === 'object'
                              ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                              : String(log.details)
                            }
                          </p>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>

                      {/* IP */}
                      <td className="px-6 py-4 text-zinc-600 text-xs font-mono">
                        {log.ipAddress || '—'}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
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
            <span className="text-sm text-zinc-500">Página {page} de {totalPages} • {total} logs</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg transition-colors">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
