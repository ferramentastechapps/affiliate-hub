'use client';

import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/admin/login')) {
      router.push('/admin/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Se for login, não mostra o layout admin
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      <AdminSidebar />
      <div className="ml-64 flex flex-col flex-1 min-h-screen w-full">
        <AdminHeader />
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
