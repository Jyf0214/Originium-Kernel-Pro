'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/hooks/use-config';
import { useActiveHeading } from '@/hooks/use-active-heading';
import { slugify } from '@/lib/slugify';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  pageType?: 'post' | 'page';
}

function TocButton({ simple, onClick }: { simple?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center transition-all ${
        simple
          ? 'text-zinc-300 hover:text-zinc-500 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-900 hover:shadow-xl'
      }`}
      aria-label="目录"
    >
      <List size={simple ? 18 : 20} />
    </button>
  );
}

interface TocItemProps {
  item: TocItem;
  index: number;
  activeId: string;
  simple?: boolean;
  maxLevel: number;
  numberEnabled?: boolean;
  onClick: () => void;
}

function TocItemButton({ item, index, activeId, simple, maxLevel, numberEnabled, onClick }: TocItemProps) {
  const isActive = activeId === item.id;
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left py-1 rounded-lg px-2 transition-colors ${
        isActive
          ? simple
            ? 'bg-zinc-50 text-zinc-700 border-l-2 border-zinc-900'
            : 'bg-zinc-100 text-zinc-900 font-medium border-l-2 border-zinc-900'
          : simple
            ? 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 border-l-2 border-transparent'
            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-l-2 border-transparent'
      } ${simple ? 'text-xs' : 'text-sm'}`}
      style={{ paddingLeft: `${(item.level - maxLevel) * (simple ? 8 : 12) + 8}px` }}
      aria-current={isActive ? 'true' : undefined}
    >
      {!simple && numberEnabled && `${index + 1}. `}{item.text}
    </button>
  );
}

interface TocPanelProps {
  open: boolean;
  items: TocItem[];
  activeId: string;
  simple?: boolean;
  maxLevel: number;
  numberEnabled?: boolean;
  onItemClick: (id: string) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

function TocPanel({ open, items, activeId, simple, maxLevel, numberEnabled, onItemClick, panelRef }: TocPanelProps) {
  if (!open) return null;
  return (
    <div
      ref={panelRef}
      className={`fixed bottom-20 right-6 z-50 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-zinc-100 ${
        simple ? 'p-3 w-56' : 'p-4 w-64'
      }`}
    >
      <h4 className={`font-bold uppercase tracking-widest text-zinc-400 mb-3 ${
        simple ? 'text-[10px]' : 'text-xs'
      }`}>目录</h4>
      <nav role="navigation" aria-label="文章目录" className={simple ? 'space-y-0.5' : 'space-y-1'}>
        {items.map((item, i) => (
          <TocItemButton
            key={i}
            item={item}
            index={i}
            activeId={activeId}
            simple={simple}
            maxLevel={maxLevel}
            numberEnabled={numberEnabled}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </nav>
    </div>
  );
}

export default function TableOfContents({ content, pageType = 'post' }: TableOfContentsProps) {
  const { config } = useConfig();
  const cfg = config?.toc;
  const [open, setOpen] = useState(cfg?.expand ?? false);
  const [items, setItems] = useState<TocItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDisabled = pageType === 'post'
    ? cfg?.post === false
    : cfg?.page !== true;

  const activeId = useActiveHeading(items);

  useEffect(() => {
    if (cfg?.expand) setOpen(true);
  }, [cfg?.expand]);

  useEffect(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TocItem[] = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1]!.length;
      let text = match[2]!.trim();
      // 去除 Markdown 链接语法 [visible](url) → visible
      text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
      // 去除 Markdown 格式字符
      text = text.replace(/[`*_~\[\]()]/g, '').trim();
      // 与 MarkdownRenderer HeadingAnchor 共用 slugify 以确保锚点 ID 一致
      const id = slugify(text);
      headings.push({ id, text, level });
    }
    setItems(headings);
  }, [content]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (isDisabled || items.length === 0) return null;

  const maxLevel = Math.min(...items.map(i => i.level));
  const simple = cfg?.styleSimple;

  const handleItemClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setOpen(false);
    }
  };

  return (
    <>
      <TocButton simple={simple} onClick={() => setOpen(!open)} />
      <TocPanel
        open={open}
        items={items}
        activeId={activeId}
        simple={simple}
        maxLevel={maxLevel}
        numberEnabled={cfg?.number}
        onItemClick={handleItemClick}
        panelRef={panelRef}
      />
    </>
  );
}
