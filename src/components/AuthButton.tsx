"use client";

import { UserCircle } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface AuthButtonProps {
  onOpenAuth: () => void;
}

export function AuthButton({ onOpenAuth }: AuthButtonProps) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Obtém as iniciais do nome do usuário de forma robusta
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  if (user) {
    return (
      <div className="relative">
        <motion.button
          onClick={() => setShowDropdown(!showDropdown)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full btn-3d flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
              {getInitials(user.name)}
            </div>
          )}
          <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
            {user.name.split(" ")[0]}
          </span>
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <>
              {/* Dropdown Overlay para fechar ao clicar fora */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl overflow-hidden z-50 shadow-liquid border border-white/10 bg-zinc-900/95 backdrop-blur-xl"
              >
                <div className="p-2">
                  <div className="px-4 py-2 border-b border-white/5 mb-1 hidden md:block">
                    <p className="text-xs text-zinc-500 font-medium">Logado como</p>
                    <p className="text-sm text-zinc-300 truncate font-semibold">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => setShowDropdown(false)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-zinc-300"
                  >
                    Produtos Salvos
                  </button>
                  <button 
                    onClick={() => {
                      setShowDropdown(false);
                      window.dispatchEvent(new CustomEvent('open-notifications'));
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-zinc-300"
                  >
                    Notificações
                  </button>
                  <button 
                    onClick={() => setShowDropdown(false)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-zinc-300"
                  >
                    Configurações
                  </button>
                  <div className="h-px bg-white/10 my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-red-400 font-medium"
                  >
                    Sair
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onOpenAuth}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
    >
      <UserCircle size={24} weight="duotone" className="text-accent" />
      <span className="text-sm font-medium hidden sm:block">Entrar</span>
    </motion.button>
  );
}
