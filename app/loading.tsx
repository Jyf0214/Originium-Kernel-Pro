'use client';

import { GlobalLoading } from '@/components/Loading';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading forNavigation />
    </div>
  );
}