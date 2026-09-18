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
  ChatCircleDots,
  Robot,
  Bell,
  Megaphone,
  Handshake,
  GearSix,
  Brain,
  ListDashes,
  Camera
} from '@phosphor-icons/react';

type MenuItemConfig = {
  name: string;
  path: string;
  icon: React.ElementType;
  hasBadge?: boolean;
};

type MenuSectionConfig = {
  items: MenuItemConfig[];
};

const MENU_SECTIONS: MenuSectionConfig[] = [
  {
    items: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: ChartPieSlice },
      { name: 'Analytics', path: '/admin/analytics', icon: ChartLineUp },
    ],
  },
  {
    items: [
      { name: 'Produtos', path: '/admin/products', icon: Package, hasBadge: true },
      { name: 'Cupons', path: '/admin/coupons', icon: Ticket },
      { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
    ],
  },
  {
    items: [
      { name: 'CRM / Usuários', path: '/admin/users', icon: Users },
      { name: 'Comentários', path: '/admin/comments', icon: ChatCircleText },
      { name: 'Campanhas', path: '/admin/campaigns', icon: Megaphone },
    ],
  },
  {
    items: [
      { name: 'Bot', path: '/admin/bot', icon: Robot },
      { name: 'WhatsApp', path: '/admin/whatsapp', icon: ChatCircleDots },
      { name: 'Filas', path: '/admin/queues', icon: ListDashes },
      { name: 'IA Criativa', path: '/admin/ai-studio', icon: Brain },
      { name: 'Social Studio', path: '/admin/social-studio', icon: Camera },
      { name: 'Notificações', path: '/admin/notifications', icon: Bell },
    ],
  },
  {
    items: [
      { name: 'Parceiros', path: '/admin/partners', icon: Handshake },
      { name: 'Logs', path: '/admin/logs', icon: ListChecks },
      { name: 'Configurações', path: '/admin/settings', icon: GearSix },
    ],
  },
];

interface AdminNavItemProps {
  item: MenuItemConfig;
  isActive: boolean;
  badge?: number | null;
}

function AdminNavItem({ item, isActive, badge }: AdminNavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      className={`flex items-center rounded-xl transition-colors h-10 justify-between px-3 ${
        isActive
          ? 'bg-indigo-500/10 text-indigo-400 font-medium'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
        <span className="text-sm whitespace-nowrap">{item.name}</span>
      </div>
      {badge ? (
        <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingProducts: 0, totalComments: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardCounts() {
      try {
        const res = await fetch('/api/admin/dashboard');
        const data = await res.json();
        if (isMounted && !data.error) {
          setCounts({
            pendingProducts: data.products?.pending || 0,
            totalComments: 0,
          });
        }
      } catch (err) {
        console.error('Erro ao buscar contadores do dashboard:', err);
      }
    }

    loadDashboardCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside
      className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800 h-[65px] px-5">
        <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 whitespace-nowrap overflow-hidden">
          Admin Economizei
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-3">
        {MENU_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.items.map((item) => (
              <AdminNavItem
                key={item.path}
                item={item}
                isActive={pathname.startsWith(item.path)}
                badge={item.hasBadge && counts.pendingProducts > 0 ? counts.pendingProducts : null}
              />
            ))}
            {idx < MENU_SECTIONS.length - 1 && (
              <div className="h-px bg-zinc-800/50 my-1 mx-3" />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
