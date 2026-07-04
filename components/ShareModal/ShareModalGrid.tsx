'use client';

import type { PlatformDef } from './types';

interface ShareModalGridProps {
  platforms: PlatformDef[];
  onShare: (platform: PlatformDef) => void;
}

export function ShareModalGrid({ platforms, onShare }: ShareModalGridProps) {
  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-4 gap-4">
        {platforms.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onShare(p)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 transition-colors group ui-interactive"
          >
            <span
              className="flex items-center justify-center w-14 h-14 rounded-2xl text-white transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
              style={{ backgroundColor: p.color }}
            >
              {p.icon}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap">
              {p.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
