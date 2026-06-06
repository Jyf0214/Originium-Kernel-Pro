'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { GlobalLoading } from '@/components/Loading';

/** 整页加载占位 */
export function EditFaceLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <GlobalLoading size="large" />
      </div>
    </div>
  );
}
