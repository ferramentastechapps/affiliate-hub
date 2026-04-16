// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏳ PÁGINA DE LOADING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        {/* Spinner animado */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Círculo externo */}
          <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
          
          {/* Círculo animado */}
          <div className="absolute inset-0 border-4 border-transparent border-t-accent rounded-full animate-spin" />
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
        </div>

        {/* Texto */}
        <p className="text-zinc-400 text-sm font-medium animate-pulse">
          Carregando...
        </p>
      </div>
    </div>
  );
}
