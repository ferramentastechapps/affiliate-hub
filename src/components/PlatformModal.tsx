"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X, ShoppingCart, ShoppingBag, Storefront, Basket } from "@phosphor-icons/react";
import clsx from "clsx";

export type AffiliateLinks = {
  amazon?: string;
  aliexpress?: string;
  shopee?: string;
  mercadoLivre?: string;
  tiktok?: string;
};

type PlatformModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  links: AffiliateLinks;
};

const platforms = [
  { id: "amazon", name: "Amazon", icon: ShoppingCart, color: "hover:bg-orange-500/20 hover:border-orange-500/50" },
  { id: "aliexpress", name: "AliExpress", icon: Basket, color: "hover:bg-red-500/20 hover:border-red-500/50" },
  { id: "shopee", name: "Shopee", icon: ShoppingBag, color: "hover:bg-orange-600/20 hover:border-orange-600/50" },
  { id: "mercadoLivre", name: "Mercado Livre", icon: Storefront, color: "hover:bg-yellow-500/20 hover:border-yellow-500/50" },
  { id: "tiktok", name: "TikTok Shop", icon: ShoppingBag, color: "hover:bg-cyan-500/20 hover:border-cyan-500/50" },
];

export function PlatformModal({ isOpen, onClose, productName, links }: PlatformModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, y: 0,
              transition: { type: "spring", stiffness: 100, damping: 20 }
            }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-md glass-panel rounded-[2rem] p-8 overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={24} weight="bold" className="text-zinc-400 hover:text-white" />
            </button>
            
            <h3 className="text-2xl tracking-tighter font-semibold mb-2 pr-8">
              Onde você prefere comprar?
            </h3>
            <p className="text-zinc-400 mb-8 max-w-[25ch] leading-relaxed">
              Você está a um passo de adquirir <span className="text-white font-medium">{productName}</span>.
            </p>

            <motion.div 
              className="flex flex-col gap-3"
              variants={{
                show: { transition: { staggerChildren: 0.05 } },
                hidden: {}
              }}
              initial="hidden"
              animate="show"
            >
              {platforms.map((platform) => {
                const url = links[platform.id as keyof AffiliateLinks];
                if (!url) return null;
                
                const Icon = platform.icon;
                
                return (
                  <motion.a
                    key={platform.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
                    }}
                    whileHover={{ scale: 0.98, x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    className={clsx(
                      "flex items-center gap-4 w-full p-4 rounded-2xl border border-white/5 bg-white/5 transition-all",
                      platform.color
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                      <Icon size={24} weight="duotone" />
                    </div>
                    <span className="text-lg font-medium tracking-tight text-zinc-100">{platform.name}</span>
                  </motion.a>
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
