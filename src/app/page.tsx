import { HeroSection } from "@/components/HeroSection";
import { ProductGrid } from "@/components/ProductGrid";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden pt-8">
      <HeroSection />
      
      <div className="w-full max-w-[1400px] mt-12 mb-8 px-4 md:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white/90">
          Recomendações
        </h2>
        <p className="text-zinc-500 mt-2">Clique no produto para escolher a loja.</p>
      </div>

      <ProductGrid />
    </main>
  );
}
