import { hasDatabase } from '@/lib/config';
import DashboardLayoutClient from './DashboardLayoutClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const databaseConfigured = hasDatabase();
  return (
    <DashboardLayoutClient databaseConfigured={databaseConfigured}>
      {children}
    </DashboardLayoutClient>
  );
}
