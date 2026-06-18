/**
 * 单个文件/目录卡片
 *
 * - 缩略图(图片用预览,其它用 lucide 图标)
 * - 文件名 + 大小
 * - 复制 URL / 移动 / 删除 按钮(悬浮显示)
 */
'use client';

import { Copy, FileText, Folder, FolderInput, Image as ImageIcon, Trash2 } from 'lucide-react';
import { message, Tooltip } from 'antd';
import type { WebDavEntry } from '@/lib/storage/types';
import { formatBytes, formatDate } from '../_lib/format';

interface Props {
  entry: WebDavEntry;
  appUrl: string;
  copyUrlLabel: string;
  copiedLabel: string;
  deleteLabel: string;
  moveLabel: string;
  urlCopied: (filename: string) => void;
  onDelete: (entry: WebDavEntry) => void;
  onMove: (entry: WebDavEntry) => void;
  disabled?: boolean;
}

function mimeMatchesImage(mime: string | null): boolean {
  if (!mime) return false;
  return mime.startsWith('image/');
}

function getFileIcon(mime: string | null, isDirectory: boolean) {
  if (isDirectory) return Folder;
  if (mime?.startsWith('image/')) return ImageIcon;
  return FileText;
}

export function StorageFileCard({
  entry,
  appUrl,
  copyUrlLabel,
  copiedLabel,
  deleteLabel,
  moveLabel,
  urlCopied,
  onDelete,
  onMove,
  disabled = false,
}: Props) {
  const Icon = getFileIcon(entry.mimeType, entry.isDirectory);
  const publicUrl = !entry.isDirectory
    ? `${appUrl.replace(/\/$/, '')}/files/${entry.basename.replace(/^\/+/, '')}`
    : '';

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      message.success(copiedLabel);
      urlCopied(entry.filename);
    } catch {
      message.error('复制失败');
    }
  };

  const showImageThumb =
    !entry.isDirectory && mimeMatchesImage(entry.mimeType);

  return (
    <div className="group relative bg-white border border-zinc-100 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all">
      {/* 缩略图 / 图标 */}
      <div className="aspect-square bg-zinc-50 flex items-center justify-center overflow-hidden">
        {showImageThumb ? (
          <img
            src={publicUrl}
            alt={entry.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon
            size={entry.isDirectory ? 48 : 40}
            className={entry.isDirectory ? 'text-amber-500' : 'text-zinc-300'}
          />
        )}
      </div>

      {/* 元数据 */}
      <div className="px-3 py-2 border-t border-zinc-50">
        <div className="text-sm font-medium text-zinc-900 truncate" title={entry.filename}>
          {entry.filename}
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center justify-between mt-0.5">
          <span>{entry.isDirectory ? '目录' : formatBytes(entry.size)}</span>
          <span className="truncate ml-2" title={formatDate(entry.lastModified)}>
            {formatDate(entry.lastModified).split(' ')[0]}
          </span>
        </div>
      </div>

      {/* 悬浮操作 */}
      {!entry.isDirectory && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title={copyUrlLabel}>
            <button
              type="button"
              onClick={handleCopy}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy size={14} />
            </button>
          </Tooltip>
          <Tooltip title={moveLabel}>
            <button
              type="button"
              onClick={() => onMove(entry)}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderInput size={14} />
            </button>
          </Tooltip>
          <Tooltip title={deleteLabel}>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-red-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      )}
      {entry.isDirectory && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title={moveLabel}>
            <button
              type="button"
              onClick={() => onMove(entry)}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderInput size={14} />
            </button>
          </Tooltip>
          <Tooltip title={deleteLabel}>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-red-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default StorageFileCard;
