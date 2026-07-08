import { isCustomPagesEnabled } from '@/lib/storage/storage-provider';
import DashboardLayoutClient from './DashboardLayoutClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const customPagesEnabled = isCustomPagesEnabled();
  return (
    <DashboardLayoutClient customPagesEnabled={customPagesEnabled}>
      {children}
    </DashboardLayoutClient>
  );
}
