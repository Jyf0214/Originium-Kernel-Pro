'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TOC, buildTree, TocItem, useTocActive, extractHeadings } from '@/components/ui/TOC';
import { Hitokoto } from '@/components/Hitokoto';
import { useAvailableWidth } from '@/hooks/use-available-width';
import { useI18n } from '@/hooks/use-i18n';

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
  const { t } = useI18n();
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
            {t('posts.toc')}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={t('posts.closeToc')}
            icon={<X size={16} />}
          />
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
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isWide = useAvailableWidth(1280);

  if (!tocConfig.enabled || headingCount < 3 || isWide) return null;

  return (
    <>
      <div className="lg:hidden w-full mb-4">
        <Button
          variant="secondary"
          size="sm"
          autoLoading={false}
          onClick={() => setDrawerOpen(true)}
          icon={<List size={14} />}
        >
          {t('posts.toc')}
        </Button>
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
