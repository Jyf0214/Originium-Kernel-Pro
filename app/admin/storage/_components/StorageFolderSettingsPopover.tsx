/**
 * 文件夹公开/私有切换面板
 *
 * - 选中根目录时返回 null(根目录不允许配置)
 * - 从 folders state 中查找对应元数据
 * - 通过 callback 触发 patch
 */
'use client';

import { Popover } from 'antd';
import { Settings2 } from 'lucide-react';
import type { StorageFolderMeta } from '@/lib/storage/types';
import ToggleField from '@/components/ui/ToggleField';

interface Props {
  currentPath: string;
  currentFolder: StorageFolderMeta | null;
  publicLabel: string;
  privateLabel: string;
  publicDesc: string;
  privateDesc: string;
  settingsTitle: string;
  notApplicableHint: string;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

export function StorageFolderSettingsPopover({
  currentPath,
  currentFolder,
  publicLabel,
  privateLabel,
  publicDesc,
  privateDesc,
  settingsTitle,
  notApplicableHint,
  onToggle,
  disabled = false,
}: Props) {
  if (!currentPath) {
    return (
      <span className="text-xs text-zinc-400 italic">{notApplicableHint}</span>
    );
  }

  if (!currentFolder) {
    return (
      <span className="text-xs text-zinc-400 italic">{notApplicableHint}</span>
    );
  }

  const content = (
    <div className="w-72 space-y-2">
      <div className="text-xs font-semibold text-zinc-900 px-1">{settingsTitle}</div>
      <ToggleField
        label={currentFolder.public ? publicLabel : privateLabel}
        description={currentFolder.public ? publicDesc : privateDesc}
        checked={currentFolder.public}
        onChange={onToggle}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      destroyTooltipOnHide
    >
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Settings2 size={12} />
        {currentFolder.public ? publicLabel : privateLabel}
      </button>
    </Popover>
  );
}

export default StorageFolderSettingsPopover;
