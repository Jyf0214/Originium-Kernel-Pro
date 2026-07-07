'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-50">
        <TopHeader onMenuClick={openSidebar} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
