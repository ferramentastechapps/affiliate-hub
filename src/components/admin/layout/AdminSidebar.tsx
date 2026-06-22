'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ChartPieSlice, 
  Package, 
  Ticket, 
  Image as ImageIcon, 
  ChartLineUp, 
  Users, 
  ListChecks,
  ChatCircleText,
  Robot,
  Bell,
  Megaphone,
  Handshake,
  GearSix
} from '@phosphor-icons/react';

export function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingProducts: 0, totalComments: 0 });

  useEffect(() => {
    // Busca a contagem do dashboard apenas para badges
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCounts({
            pendingProducts: data.products?.pending || 0,
            // A API de dashboard ainda não retorna comments. Se precisar, ideal é adicionar lá. 
            // Mas para mock ou para usar o que temos, vamos manter a estrutura visual
            totalComments: 0
          });
        }
      })
      .catch(() => {});
  }, []);

  const menuSections = [
    {
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: ChartPieSlice },
        { name: 'Analytics', path: '/admin/analytics', icon: ChartLineUp },
      ]
    },
    {
      items: [
        { name: 'Produtos', path: '/admin/products', icon: Package, badge: counts.pendingProducts },
        { name: 'Cupons', path: '/admin/coupons', icon: Ticket },
        { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
      ]
    },
    {
      items: [
        { name: 'CRM / Usuários', path: '/admin/users', icon: Users },
        { name: 'Comentários', path: '/admin/comments', icon: ChatCircleText },
        { name: 'Campanhas', path: '/admin/campaigns', icon: Megaphone },
      ]
    },
    {
      items: [
        { name: 'Bot', path: '/admin/bot', icon: Robot },
        { name: 'Notificações', path: '/admin/notifications', icon: Bell },
      ]
    },
    {
      items: [
        { name: 'Parceiros', path: '/admin/partners', icon: Handshake },
        { name: 'Logs', path: '/admin/logs', icon: ListChecks },
        { name: 'Configurações', path: '/admin/settings', icon: GearSix },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed top-0 left-0 z-20">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Admin Economizei
        </h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {idx < menuSections.length - 1 && (
              <div className="h-px bg-zinc-800/50 my-2 mx-4" />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
