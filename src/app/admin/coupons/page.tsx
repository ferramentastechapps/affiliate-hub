import { CouponsTab } from '@/components/admin/CouponsTab';

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Cupons</h1>
        <p className="text-zinc-400 mt-2">Gerencie os cupons de desconto.</p>
      </div>
      <CouponsTab />
    </div>
  );
}
