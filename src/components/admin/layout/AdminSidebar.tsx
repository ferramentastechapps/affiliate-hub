'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Bell
} from '@phosphor-icons/react';

export function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: ChartPieSlice },
    { name: 'Produtos', path: '/admin/products', icon: Package },
    { name: 'Cupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: ChartLineUp },
    { name: 'Usuários', path: '/admin/users', icon: Users },
    { name: 'Comentários', path: '/admin/comments', icon: ChatCircleText },
    { name: 'Logs', path: '/admin/logs', icon: ListChecks },
    { name: 'Bot', path: '/admin/bot', icon: Robot },
    { name: 'Notificações', path: '/admin/notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed top-0 left-0 z-20">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Admin Economizei
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <item.icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
