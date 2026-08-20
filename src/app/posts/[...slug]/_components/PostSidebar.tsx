'use client';

import { useState, useMemo, useCallback } from 'react';
import { List, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
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

/** 移动端目录按钮 — 放在文章内容之前，点击弹出半屏抽屉 */
export function PostSidebarTrigger({ content, headingCount, tocConfig }: PostSidebarConfig) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isWide = useAvailableWidth(1280);

  const headings = useMemo(() => extractHeadings(content), [content]);
  const tree = useMemo(() => buildTree(headings), [headings]);
  const activeId = useTocActive(headings);

  const handleLinkClick = useCallback(() => {
    setTimeout(() => setDrawerOpen(false), 150);
  }, []);

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
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="right"
        widthClass="w-[min(50vw,20rem)]"
        overlayClassName="bg-black/30"
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
            onClick={() => setDrawerOpen(false)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={t('posts.closeToc')}
            icon={<X size={16} />}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <TocItem
            items={tree}
            activeId={activeId}
            numbering={tocConfig.number}
            onLinkClick={handleLinkClick}
          />
        </div>
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
          <Hitokoto />
        </div>
      </Drawer>
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
