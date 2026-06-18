'use client';

import { Loader2 } from 'lucide-react';

export default function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm font-medium">加载中…</span>
      </div>
    </div>
  );
}
