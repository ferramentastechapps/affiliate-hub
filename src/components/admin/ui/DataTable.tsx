import React from 'react';

interface DataTableProps {
  columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
  data: any[];
  isLoading?: boolean;
}

export function DataTable({ columns, data, isLoading }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
        Nenhum registro encontrado.
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
      <table className="w-full text-left text-sm text-zinc-300">
        <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 font-medium whitespace-nowrap">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="px-6 py-4">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
