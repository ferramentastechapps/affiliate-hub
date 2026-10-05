import { ReelsTab } from '@/components/admin/ReelsTab';

export const dynamic = 'force-dynamic';

export default function ReelsPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Reels</h1>
      <ReelsTab />
    </div>
  );
}
