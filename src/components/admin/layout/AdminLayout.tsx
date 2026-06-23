'use client';

import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/admin/login')) {
      router.push('/admin/login');
    }
  }, [user, loading, router, pathname]);

  // Sincroniza com o estado do sidebar (salvo no localStorage)
  useEffect(() => {
    const check = () => {
      const saved = localStorage.getItem('admin-sidebar-collapsed');
      setSidebarCollapsed(saved === 'true');
    };
    check();
    window.addEventListener('storage', check);
    // Polling leve para pegar mudanças do mesmo tab
    const interval = setInterval(check, 150);
    return () => {
      window.removeEventListener('storage', check);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      <AdminSidebar />
      <div
        className="flex flex-col flex-1 min-h-screen w-full transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '60px' : '256px' }}
      >
        <AdminHeader />
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
