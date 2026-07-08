import { hasDatabase } from '@/lib/config';
import { isCustomPagesEnabled } from '@/lib/storage/storage-provider';
import DashboardLayoutClient from './DashboardLayoutClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const databaseConfigured = hasDatabase();
  const customPagesEnabled = isCustomPagesEnabled();
  return (
    <DashboardLayoutClient databaseConfigured={databaseConfigured} customPagesEnabled={customPagesEnabled}>
      {children}
    </DashboardLayoutClient>
  );
}
