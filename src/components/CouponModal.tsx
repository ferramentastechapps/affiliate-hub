"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ArrowRight } from "@phosphor-icons/react";
import { useState } from "react";

type CouponModalProps = {
  isOpen: boolean;
  onClose: () => void;
  couponCode: string;
  productName: string;
  platformName: string;
  affiliateUrl: string;
  onGoToStore: () => void;
};

export function CouponModal({ 
  isOpen, 
  onClose, 
  couponCode, 
  productName,
  platformName,
  affiliateUrl,
  onGoToStore 
}: CouponModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToStore = () => {
    onGoToStore();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: { type: "spring", stiffness: 300, damping: 30 }
            }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-gradient-to-br from-zinc-900 to-black border border-accent/30 shadow-[0_0_80px_rgba(40,110,250,0.3)] rounded-3xl p-8 flex flex-col items-center text-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <X size={20} weight="bold" />
            </button>

            {/* Ícone de Cupom Animado */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-accent to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(40,110,250,0.5)]"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 14.5L14.5 9.5M9.75 9.75H9.76M14.25 14.25H14.26M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM10 9.75C10 9.88807 9.88807 10 9.75 10C9.61193 10 9.5 9.88807 9.5 9.75C9.5 9.61193 9.61193 9.5 9.75 9.5C9.88807 9.5 10 9.61193 10 9.75ZM14.5 14.25C14.5 14.3881 14.3881 14.5 14.25 14.5C14.1119 14.5 14 14.3881 14 14.25C14 14.1119 14.1119 14 14.25 14C14.3881 14 14.5 14.1119 14.5 14.25Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">
              🎉 Cupom de Desconto!
            </h2>
            
            <p className="text-zinc-400 text-sm mb-6 max-w-xs">
              Cole este cupom no carrinho da <span className="text-white font-semibold">{platformName}</span> para garantir seu desconto
            </p>

            {/* Cupom Code */}
            <div className="w-full bg-black/50 border-2 border-dashed border-accent/50 rounded-2xl p-6 mb-6">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                Código do Cupom
              </span>
              <code className="text-3xl font-mono font-black text-white tracking-wider block mb-4">
                {couponCode}
              </code>
              
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                  copied 
                    ? "bg-emerald-500 text-white" 
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={20} weight="bold" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={20} weight="bold" />
                    Copiar Cupom
                  </>
                )}
              </button>
            </div>

            {/* Instruções */}
            <div className="w-full bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-left">
              <h3 className="text-white font-bold text-sm mb-2">📋 Como usar:</h3>
              <ol className="text-zinc-300 text-xs space-y-1.5 list-decimal list-inside">
                <li>Copie o cupom acima</li>
                <li>Clique em "Ir para a Loja"</li>
                <li>Adicione o produto ao carrinho</li>
                <li>Cole o cupom no campo de desconto</li>
              </ol>
            </div>

            {/* Botão Ir para Loja */}
            <button
              onClick={handleGoToStore}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(40,110,250,0.5)]"
            >
              Ir para a Loja
              <ArrowRight size={22} weight="bold" />
            </button>

            <p className="text-zinc-600 text-xs mt-4">
              O cupom será copiado automaticamente
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
