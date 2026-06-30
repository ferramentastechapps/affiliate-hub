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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/admin/login')) {
      router.push('/admin/login');
    }
  }, [user, loading, router, pathname]);

  // Fechar sidebar mobile ao mudar de página
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Fechar sidebar mobile ao clicar ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileSidebarOpen]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Overlay quando sidebar está aberta (apenas mobile) */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 w-64
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AdminSidebar />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex flex-col min-h-screen w-full lg:pl-64">
        <AdminHeader 
          onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          mobileSidebarOpen={mobileSidebarOpen}
        />
        <main 
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
