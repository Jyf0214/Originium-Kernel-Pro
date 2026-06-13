'use client';

import React from 'react';
import Footer from '@/components/Footer';
import { PageContainer } from '@/components/ui/PageContainer';

/** 编辑页壳布局:Navbar + PageContainer + Footer */
export function EditFaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <PageContainer maxWidth="4xl">{children}</PageContainer>
      <Footer />
    </div>
  );
}
