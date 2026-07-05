'use client';

import { Globe } from 'lucide-react';
import { ProgressBar } from '@/components/Loading/ProgressBar';

export default function PageIndexLoading() {
  return (
    <div className="flex min-h-screen">
      <ProgressBar />
      <div className="hidden md:block w-[280px] bg-white border-r border-zinc-100" />
      <div className="flex-1 flex flex-col md:ml-[280px] min-h-screen bg-zinc-50">
        <div className="h-16 bg-white border-b border-zinc-100" />
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <Globe size={20} />
                </span>
                <div className="h-8 w-48 rounded-lg bg-zinc-200 animate-pulse" />
              </div>
              <div className="h-4 w-64 rounded bg-zinc-200 animate-pulse mt-2" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 rounded-xl bg-zinc-100" />
                    <div className="h-5 w-12 rounded-full bg-zinc-100" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-zinc-200 mb-2" />
                  <div className="h-3 w-1/2 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
