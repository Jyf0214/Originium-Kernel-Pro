'use client';

import React from 'react';
import { GlobalLoading } from '@/components/Loading';

/** 整页加载占位 */
export function EditFaceLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="flex-1 flex items-center justify-center">
        <GlobalLoading size="large" />
      </div>
    </div>
  );
}
