'use client';

import { useAuth } from '@/components/AuthProvider';
import { SignOut, UserCircle, List, X } from '@phosphor-icons/react';

interface AdminHeaderProps {
  onMenuClick?: () => void;
  mobileSidebarOpen?: boolean;
}

export function AdminHeader({ onMenuClick, mobileSidebarOpen }: AdminHeaderProps = {}) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 lg:h-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
      {/* Mobile: Botão Menu Hambúrguer */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label={mobileSidebarOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileSidebarOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <List size={24} weight="bold" />
          )}
        </button>
        
        {/* Mobile: Título/Logo simplificado */}
        <h1 className="lg:hidden text-sm font-bold text-accent">Admin</h1>
      </div>

      {/* Desktop: Espaçador */}
      <div className="hidden lg:block flex-1"></div>

      {/* User Info & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center space-x-2 sm:space-x-3 bg-zinc-900/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-zinc-800">
          {user?.image ? (
            <img src={user.image} alt={user.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
          ) : (
            <UserCircle className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-400" />
          )}
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-zinc-200 leading-none">{user?.name}</span>
            <span className="text-xs text-zinc-500 mt-1">{user?.role === 'admin' ? 'Administrador' : 'Moderador'}</span>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
          title="Sair"
        >
          <SignOut weight="bold" className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
