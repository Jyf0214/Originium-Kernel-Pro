'use client';

import { Link2, Check, Copy } from 'lucide-react';

interface ShareModalFooterProps {
  shareUrl: string;
  copied: boolean;
  onCopy: () => void;
}

export function ShareModalFooter({ shareUrl, copied, onCopy }: ShareModalFooterProps) {
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-100">
        <Link2 size={14} className="text-zinc-400 shrink-0" />
        <span className="flex-1 text-sm text-zinc-400 truncate">{shareUrl}</span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-500" />
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
