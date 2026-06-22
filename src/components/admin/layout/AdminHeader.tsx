'use client';

import { useAuth } from '@/components/AuthProvider';
import { SignOut, UserCircle } from '@phosphor-icons/react';

export function AdminHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="h-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex-1"></div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
          {user?.image ? (
            <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full" />
          ) : (
            <UserCircle className="w-8 h-8 text-zinc-400" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200 leading-none">{user?.name}</span>
            <span className="text-xs text-zinc-500 mt-1">{user?.role === 'admin' ? 'Administrador' : 'Moderador'}</span>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
          title="Sair"
        >
          <SignOut weight="bold" className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
