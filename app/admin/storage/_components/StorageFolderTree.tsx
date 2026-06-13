/**
 * 左侧文件夹树(简化版:只列顶层 storage_folders,不做递归)
 *
 * - 选中项高亮
 * - 公开/私有用 Tag 标记
 * - 点击 → navigateTo(folder.path)
 */
'use client';

import { Folder, Globe, Lock, Plus } from 'lucide-react';
import type { StorageFolderMeta } from '@/lib/storage/types';
import { Tag } from '@/components/ui/Tag';

interface Props {
  folders: StorageFolderMeta[];
  currentPath: string;
  rootLabel: string;
  publicLabel: string;
  privateLabel: string;
  onNavigate: (path: string) => void;
  onNewFolder: () => void;
  disabled?: boolean;
}

export function StorageFolderTree({
  folders,
  currentPath,
  rootLabel,
  publicLabel,
  privateLabel,
  onNavigate,
  onNewFolder,
  disabled = false,
}: Props) {
  const isRootActive = currentPath === '';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {rootLabel}
        </span>
        <button
          type="button"
          onClick={onNewFolder}
          disabled={disabled}
          title={disabled ? '存储后端未配置' : '新建文件夹'}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <button
          type="button"
          onClick={() => onNavigate('')}
          className={[
            'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
            isRootActive
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-700 hover:bg-zinc-50',
          ].join(' ')}
        >
          <Folder size={14} className={isRootActive ? 'text-white' : 'text-zinc-400'} />
          <span className="flex-1 text-left font-medium">{rootLabel}</span>
        </button>

        {folders.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">
            暂无文件夹
          </div>
        ) : (
          <ul className="mt-1 space-y-0.5 px-2">
            {folders.map((folder) => {
              const active = currentPath === folder.path;
              return (
                <li key={folder.path}>
                  <button
                    type="button"
                    onClick={() => onNavigate(folder.path)}
                    className={[
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-zinc-100 text-zinc-900 font-semibold'
                        : 'text-zinc-700 hover:bg-zinc-50',
                    ].join(' ')}
                  >
                    <Folder
                      size={14}
                      className={active ? 'text-zinc-700' : 'text-zinc-400'}
                    />
                    <span className="flex-1 text-left truncate">
                      {folder.path.split('/')[0]}
                    </span>
                    <Tag
                      size="sm"
                      variant={folder.public ? 'emerald' : 'light'}
                      className="shrink-0"
                    >
                      <span className="inline-flex items-center gap-1">
                        {folder.public ? (
                          <Globe size={10} />
                        ) : (
                          <Lock size={10} />
                        )}
                        {folder.public ? publicLabel : privateLabel}
                      </span>
                    </Tag>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default StorageFolderTree;
