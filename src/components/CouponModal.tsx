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
  imageUrl: string;
  onGoToStore: () => void;
};

export function CouponModal({ 
  isOpen, 
  onClose, 
  couponCode, 
  productName,
  platformName,
  affiliateUrl,
  imageUrl,
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

            {/* Imagem do Produto */}
            <div className="w-28 h-28 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 p-2 overflow-hidden shadow-xl">
              <img 
                src={imageUrl} 
                alt={productName} 
                className="w-full h-full object-contain mix-blend-normal"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.webp";
                }}
              />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-6 leading-snug line-clamp-2 px-2">
              {productName}
            </h2>

            {/* Cupom Code */}
            <div className="w-full bg-black/50 border-2 border-dashed border-accent/50 rounded-2xl p-6 mb-6">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                Código do Cupom
              </span>
              <code className="text-3xl font-mono font-black text-white tracking-wider block mb-4">
                {couponCode}
              </code>
              
              <button
                onClick={() => { handleCopy(); handleGoToStore(); }}
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
              onClick={() => { handleCopy(); handleGoToStore(); }}
              className="w-full flex items-center justify-center gap-2 btn-3d text-white font-bold text-base sm:text-lg py-4 sm:py-5 rounded-[20px] min-h-[56px]"
            >
              Copiar e Ir para {platformName}
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
