'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { TOC, buildTree, TocItem, useTocActive, slugify } from '@/components/ui/TOC';
import type { TocHeading } from '@/components/ui/TOC';
import { Hitokoto } from '@/components/Hitokoto';
import { useAvailableWidth } from '@/hooks/use-available-width';

interface PostSidebarConfig {
  content: string;
  headingCount: number;
  tocConfig: {
    enabled: boolean;
    number: boolean;
    expand: boolean;
    styleSimple: boolean;
  };
}

/** 从 Markdown 提取 h2~h4 标题 */
function extractHeadings(content: string): TocHeading[] {
  const regex = /^(#{1,6})\s+(.+)$/gm;
  const result: TocHeading[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const level = match[1]!.length;
    if (level <= 1 || level > 4) continue;
    const text = match[2]!.replace(/[`*_~\[\]()]/g, '').trim();
    result.push({ id: slugify(text), text, level });
  }
  return result;
}

/** 移动端半屏抽屉 */
function MobileTocDrawer({
  content,
  number,
  onClose,
}: {
  content: string;
  number: boolean;
  onClose: () => void;
}) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const tree = useMemo(() => buildTree(headings), [headings]);
  const activeId = useTocActive(headings);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleLinkClick = useCallback(() => {
    setTimeout(onClose, 150);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-[min(50vw,20rem)] z-50 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            目录
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="关闭目录"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <TocItem
            items={tree}
            activeId={activeId}
            numbering={number}
            onLinkClick={handleLinkClick}
          />
        </div>
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
          <Hitokoto />
        </div>
      </motion.div>
    </>
  );
}

/** 移动端目录按钮 — 放在文章内容之前，点击弹出半屏抽屉 */
export function PostSidebarTrigger({ content, headingCount, tocConfig }: PostSidebarConfig) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isWide = useAvailableWidth(1280);

  if (!tocConfig.enabled || headingCount < 3 || isWide) return null;

  return (
    <>
      <div className="lg:hidden w-full mb-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
        >
          <List size={14} />
          目录
        </button>
      </div>
      <AnimatePresence>
        {drawerOpen && (
          <MobileTocDrawer
            content={content}
            number={tocConfig.number}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** 桌面端 sticky 侧栏 — 仅在宽屏（≥1280px）时显示 */
export function PostSidebarDesktop({ content, headingCount, tocConfig }: PostSidebarConfig) {
  const isWide = useAvailableWidth(1280);

  if (!tocConfig.enabled || headingCount < 3 || !isWide) return null;

  return (
    <aside className="hidden lg:block w-56 shrink-0 animate-sidebar-slidein">
      <div className="sticky top-24">
        <TOC
          content={content}
          config={{
            number: tocConfig.number,
            expand: tocConfig.expand,
            styleSimple: tocConfig.styleSimple,
          }}
          showMobileUI={false}
        />
      </div>
    </aside>
  );
}
