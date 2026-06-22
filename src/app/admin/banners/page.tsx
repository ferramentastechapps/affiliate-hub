import { BannersTab } from '@/components/admin/BannersTab';

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Banners</h1>
        <p className="text-zinc-400 mt-2">Gerencie os banners da página inicial.</p>
      </div>
      <BannersTab />
    </div>
  );
}
