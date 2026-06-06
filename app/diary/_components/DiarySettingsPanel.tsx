'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DiarySettingsPanel({
  exportLoading,
  onExport,
}: {
  exportLoading: boolean;
  onExport: () => void;
}) {
  return (
    <div className="mb-6 sm:mb-8 bg-white rounded-2xl border border-zinc-100 p-4 sm:p-6">
      <h3 className="text-sm font-bold text-zinc-900 mb-3">日记设置</h3>
      <div className="space-y-3">
        <Button
          variant="primary"
          size="md"
          onClick={onExport}
          disabled={exportLoading}
          loading={exportLoading}
          icon={<Download size={16} />}
        >
          导出全部日记（Markdown）
        </Button>
        <p className="text-xs text-zinc-400">导出的 Markdown 文件包含所有日记的标题、内容、标签和日期。</p>
      </div>
    </div>
  );
}
