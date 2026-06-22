import { ProductsTab } from '@/components/admin/ProductsTab';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Produtos</h1>
        <p className="text-zinc-400 mt-2">Gerencie as ofertas e produtos da plataforma.</p>
      </div>
      <ProductsTab />
    </div>
  );
}
