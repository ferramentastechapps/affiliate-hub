"use client";

import { UserCircle, User } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface AuthButtonProps {
  onOpenAuth: () => void;
}

export function AuthButton({ onOpenAuth }: AuthButtonProps) {
  const [isLoggedIn] = useState(false); // TODO: Conectar com sistema de auth real
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="relative">
        <motion.button
          onClick={() => setShowDropdown(!showDropdown)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
            JD
          </div>
          <span className="text-sm font-medium hidden sm:block">João Silva</span>
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <>
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
                className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl overflow-hidden z-50"
              >
                <div className="p-2">
                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
                    Produtos Salvos
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
                    Notificações
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
                    Configurações
                  </button>
                  <div className="h-px bg-white/10 my-2" />
                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-red-400">
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
