'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/ui';
import { EASE_STANDARD } from '@/components/ui/motion';

/** 一言 API 返回数据结构 */
interface HitokotoData {
  hitokoto: string;
  from: string;
  from_who?: string;
}

interface HitokotoProps {
  className?: string;
}

/**
 * 一言组件 — 从 hitokoto.cn 获取随机一语，点击可刷新
 */
export function Hitokoto({ className }: HitokotoProps) {
  const [data, setData] = useState<HitokotoData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHitokoto = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://v1.hitokoto.cn');
      if (!res.ok) return;
      const json = (await res.json()) as HitokotoData;
      setData(json);
    } catch {
      // 静默处理错误，不显示错误信息
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHitokoto();
  }, [fetchHitokoto]);

  const displayText = data?.hitokoto ?? '';
  const sourceText = data?.from_who ? `${data.from_who} —— ${data.from}` : data?.from ?? '';

  return (
    <button
      type="button"
      onClick={fetchHitokoto}
      className={cn(
        'group flex items-center gap-2 cursor-pointer select-none w-full justify-center',
        'bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-850',
        'rounded-full px-4 py-1.5 text-sm text-zinc-500 dark:text-zinc-400',
        'border border-zinc-200/50 dark:border-zinc-700/50',
        'hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors',
        className,
      )}
      title="点击刷新一言"
    >
      {loading && !data ? (
        <Skeleton className="h-4 w-48 rounded" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.span
            key={displayText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE_STANDARD }}
            className="truncate max-w-[60vw] md:max-w-[40vw]"
          >
            {displayText}
            {sourceText && (
              <span className="ml-1.5 text-zinc-400 dark:text-zinc-500 text-xs">
                —— {sourceText}
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}

export default Hitokoto;
