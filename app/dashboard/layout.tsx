'use client';
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isSudo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }

  // sudo 用户默认显示 admin 侧边栏（可切换到用户视图），普通用户显示 user 侧边栏
  const sidebarVariant = isSudo ? 'admin' : 'user';

  return (
    <div className="flex min-h-screen">
      <Sidebar variant={sidebarVariant} />
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-50">
        <TopHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
