/**
 * 右侧文件网格 — 列出当前路径条目,网格布局
 *
 * - 空时展示 EmptyState
 * - 单个目录/文件用 StorageFileCard 渲染
 * - 点击文件名 = 进入目录 / 复制 URL
 */
'use client';

import { Inbox, RefreshCw } from 'lucide-react';
import { Tooltip } from 'antd';
import type { WebDavEntry } from '@/lib/storage/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { StorageFileCard } from './StorageFileCard';
import type { DialogKind, DialogTarget } from '../_lib/types';

interface Props {
  entries: WebDavEntry[];
  loading: boolean;
  appUrl: string;
  currentPath: string;
  copyUrlLabel: string;
  copiedLabel: string;
  deleteLabel: string;
  refreshLabel: string;
  noFilesLabel: string;
  noFilesHint: string;
  onNavigate: (path: string) => void;
  onDelete: (entry: WebDavEntry) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export function StorageFileGrid({
  entries,
  loading,
  appUrl,
  currentPath,
  copyUrlLabel,
  copiedLabel,
  deleteLabel,
  refreshLabel,
  noFilesLabel,
  noFilesHint,
  onNavigate,
  onDelete,
  onRefresh,
  disabled = false,
}: Props) {
  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm">加载中…</div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={48} className="text-zinc-200" />}
        title={noFilesLabel}
        description={noFilesHint}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <Tooltip title={refreshLabel}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} />
            {refreshLabel}
          </button>
        </Tooltip>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {entries.map((entry) => (
          <div
            key={entry.basename}
            onDoubleClick={() => {
              if (entry.isDirectory) {
                const next = currentPath
                  ? `${currentPath}/${entry.filename}`
                  : entry.filename;
                onNavigate(next);
              }
            }}
            className={entry.isDirectory ? 'cursor-pointer' : ''}
          >
            <StorageFileCard
              entry={entry}
              appUrl={appUrl}
              copyUrlLabel={copyUrlLabel}
              copiedLabel={copiedLabel}
              deleteLabel={deleteLabel}
              urlCopied={() => undefined}
              onDelete={onDelete}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export shared types for parent
export type { DialogKind, DialogTarget };

export default StorageFileGrid;
