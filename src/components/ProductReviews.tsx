"use client";

import { useState, useEffect } from "react";
import { Star, ThumbsUp, ShieldCheck } from "@phosphor-icons/react";

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  helpful: number;
  verified: boolean;
  publishedAt: string;
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-6 border-t border-white/5">
        <div className="h-6 w-48 bg-white/5 rounded-lg mb-6"></div>
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <div className="py-8 border-t border-white/5">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Star size={24} weight="fill" className="text-yellow-400" />
        Avaliações de Compradores
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-medium text-white flex items-center gap-2">
                  {review.authorName}
                  {review.verified && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={12} weight="fill" /> Verificado
                    </span>
                  )}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(review.publishedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} weight={i < review.rating ? "fill" : "regular"} className={i >= review.rating ? "text-zinc-600" : ""} />
                ))}
              </div>
            </div>
            <p className="text-sm text-zinc-300 mb-4 line-clamp-4">
              "{review.comment}"
            </p>
            {review.helpful > 0 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <ThumbsUp size={14} /> {review.helpful} pessoas acharam útil
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
