"use client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💀 SKELETON LOADERS - Componentes de loading animados
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ProductCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
      {/* Imagem skeleton */}
      <div className="aspect-[4/5] bg-zinc-800" />
      
      {/* Conteúdo skeleton */}
      <div className="p-4 space-y-3">
        {/* Categoria */}
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        
        {/* Nome */}
        <div className="h-5 w-3/4 bg-zinc-800 rounded" />
        
        {/* Preço */}
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        
        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-10 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CouponCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          {/* Código e plataforma */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 bg-zinc-800 rounded-lg" />
            <div className="h-5 w-24 bg-zinc-800 rounded" />
          </div>
          
          {/* Descrição */}
          <div className="h-4 w-3/4 bg-zinc-800 rounded" />
          
          {/* Desconto */}
          <div className="h-4 w-32 bg-zinc-800 rounded" />
        </div>
        
        {/* Botões */}
        <div className="flex gap-2">
          <div className="h-10 w-20 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CouponsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CouponCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
