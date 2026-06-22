import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - Economizei',
  description: 'Painel de Administração',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
