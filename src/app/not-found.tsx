import Link from "next/link";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 PÁGINA 404 - NÃO ENCONTRADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Ícone animado */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-full p-8">
              <MagnifyingGlass size={80} weight="duotone" className="text-accent" />
            </div>
          </div>
        </div>

        {/* Código 404 */}
        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400 mb-4">
          404
        </h1>

        {/* Mensagem */}
        <h2 className="text-3xl font-bold text-white mb-4">
          Página não encontrada
        </h2>
        <p className="text-lg text-zinc-400 mb-8 max-w-md mx-auto">
          Ops! A página que você está procurando não existe ou foi movida.
        </p>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-black px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
          >
            <ArrowLeft size={20} weight="bold" />
            Voltar para Home
          </Link>
          
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Ir para Admin
          </Link>
        </div>

        {/* Sugestões */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-4">Você pode estar procurando por:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-accent transition-colors underline"
            >
              Produtos
            </Link>
            <span className="text-zinc-700">•</span>
            <Link
              href="/#cupons"
              className="text-sm text-zinc-400 hover:text-accent transition-colors underline"
            >
              Cupons
            </Link>
            <span className="text-zinc-700">•</span>
            <Link
              href="/admin"
              className="text-sm text-zinc-400 hover:text-accent transition-colors underline"
            >
              Painel Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
