'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NavigationNode {
  slug: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  public: boolean;
  children: NavigationNode[];
}

interface PostNavigationProps {
  /** 服务端预渲染的初始目录树 */
  initialTree: NavigationNode[];
}

// ─── 内置 icon 名称 → lucide 组件映射 ──────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Folder,
  FileText,
};

function resolveIcon(name: string): React.FC<{ className?: string }> {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Folder;
}

// ─── 递归树节点 ─────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: NavigationNode;
  depth: number;
  pathname: string;
}

function TreeNode({ node, depth, pathname }: TreeNodeProps) {
  const isActive = pathname === `/posts/${node.slug}` || pathname.startsWith(`/posts/${node.slug}/`);
  const hasChildren = node.children.length > 0;

  const [expanded, setExpanded] = useState(isActive);

  // 当路径变化时，自动展开包含当前路径的节点
  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  const IconComponent = resolveIcon(node.icon);

  return (
    <div>
      <Link
        href={`/posts/${node.slug}`}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
          ${isActive
            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {/* 展开/折叠按钮（仅当有子目录时显示） */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="shrink-0 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            aria-label={expanded ? '折叠' : '展开'}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="shrink-0 w-[18px]" />
        )}

        <IconComponent className="w-4 h-4 shrink-0" />

        <span className="truncate">{node.title}</span>
      </Link>

      {/* 子目录 */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.slug}
              node={child}
              depth={depth + 1}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 骨架屏 ─────────────────────────────────────────────────────────────────

function SkeletonTree() {
  return (
    <div className="space-y-2 px-3 animate-pulse">
      {[40, 55, 35, 50, 30].map((w, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(i % 3) * 16}px` }}>
          <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────

export default function PostNavigation({ initialTree }: PostNavigationProps) {
  const pathname = usePathname();
  const [tree, setTree] = useState<NavigationNode[]>(initialTree);
  const [loading, setLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/navigation');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tree)) {
          setTree(data.tree);
        }
      }
    } catch {
      // 获取失败时保留初始数据，不中断用户操作
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  return (
    <nav
      className="hidden lg:block w-64 shrink-0 sticky top-24 self-start"
      aria-label="文章导航"
    >
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur p-3">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            目录导航
          </h3>
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
          )}
        </div>

        {/* 内容区 */}
        {loading && tree.length === 0 ? (
          <SkeletonTree />
        ) : tree.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
            暂无目录
          </p>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.slug}
                node={node}
                depth={0}
                pathname={pathname}
              />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
