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
  GearSix,
  Brain,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';

export function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingProducts: 0, totalComments: 0 });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      return next;
    });
  }

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCounts({
            pendingProducts: data.products?.pending || 0,
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
        { name: 'IA Criativa', path: '/admin/ai-studio', icon: Brain },
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

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-64';

  return (
    <aside
      className={`${sidebarWidth} bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed top-0 left-0 z-20 transition-all duration-300`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-zinc-800 h-[65px] ${collapsed ? 'justify-center px-0' : 'px-5 justify-between'}`}>
        {!collapsed && (
          <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 whitespace-nowrap overflow-hidden">
            Admin Economizei
          </h1>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
        >
          {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-3">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl transition-colors h-10 ${
                    collapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                    <item.icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm whitespace-nowrap">{item.name}</span>}
                  </div>
                  {!collapsed && item.badge ? (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      {item.badge}
                    </span>
                  ) : collapsed && item.badge ? (
                    <span className="absolute ml-7 mb-4 bg-indigo-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {idx < menuSections.length - 1 && (
              <div className={`h-px bg-zinc-800/50 my-1 ${collapsed ? 'mx-2' : 'mx-3'}`} />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
