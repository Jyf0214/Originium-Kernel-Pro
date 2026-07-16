'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import { FeatureDisabledView } from '@/components/ui/FeatureDisabledView';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  databaseConfigured: boolean;
}

export default function DashboardLayoutClient({ children, databaseConfigured }: DashboardLayoutClientProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); }
  }, [user, loading, router]);

  // 数据库未配置时显示降级页
  if (!databaseConfigured) {
    return <FeatureDisabledView feature="仪表盘" />;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} databaseConfigured={databaseConfigured} />
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-50">
        <TopHeader onMenuClick={openSidebar} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
