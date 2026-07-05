'use client';

import React, { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { Github, CheckCircle2 } from 'lucide-react';
import { createTwoFilesPatch } from 'diff';

interface GitHubDiffProps {
  filePath: string;
  repo: string;
  oldContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  open?: boolean;
}

interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  text: string;
}

interface DiffHunk {
  lines: DiffLine[];
}

function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;

  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { lines: [] };
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      current?.lines.push({ type: 'add', text: line.slice(1) });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current?.lines.push({ type: 'del', text: line.slice(1) });
    } else if (line.startsWith(' ')) {
      current?.lines.push({ type: 'ctx', text: line.slice(1) });
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

export function GitHubDiffModal({
  filePath,
  repo,
  oldContent,
  newContent,
  onConfirm,
  onCancel,
  loading = false,
  open = false,
}: GitHubDiffProps) {
  const [hunks, setHunks] = useState<DiffHunk[]>([]);

  useEffect(() => {
    const patch = createTwoFilesPatch('', '', oldContent ?? '', newContent ?? '', '', '', { context: 3 });
    setHunks(parseUnifiedDiff(patch));
  }, [oldContent, newContent]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnClose
      className="github-diff-modal"
      width="min(760px, calc(100vw - 32px))"
      styles={{
        body: { padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 80px)' },
      }}
    >
      {/* 标题栏 */}
      <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
            <Github size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 leading-tight">确认配置变更</h2>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              <span className="font-mono">{filePath}</span>
              {repo && <span className="ml-1.5 opacity-50">· {repo}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Diff 内容区 — 关键：overflow-x-hidden 防止长行撑宽 */}
      <div className="mx-3 sm:mx-4 bg-zinc-900 rounded-lg overflow-hidden">
        <div className="max-h-[45vh] sm:max-h-80 overflow-y-auto overflow-x-hidden">
          <div className="font-mono text-xs sm:text-sm leading-5 min-w-0">
            {hunks.length === 0 && (
              <div className="text-zinc-500 text-center py-6">无变更</div>
            )}
            {hunks.map((hunk, hi) => (
              <div key={hi}>
                {hunk.lines.map((line, li) => {
                  let bg = '';
                  let fg = 'text-zinc-400';
                  let prefix = ' ';
                  if (line.type === 'add') { bg = 'bg-green-900/30'; fg = 'text-green-300'; prefix = '+'; }
                  if (line.type === 'del') { bg = 'bg-red-900/30'; fg = 'text-red-300'; prefix = '-'; }
                  return (
                    <div key={li} className={`${bg} ${fg} px-3 sm:px-4`}>
                      <span className="select-none w-4 inline-block text-center mr-2 sm:mr-3 opacity-50 text-[10px] sm:text-xs">{prefix}</span>
                      <span className="break-all">{line.text}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-5 sm:py-4">
        <Button onClick={onCancel} disabled={loading} variant="default" size="sm" autoLoading={false}>
          取消
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          onClick={onConfirm}
          icon={<CheckCircle2 size={14} />}
        >
          确认提交
        </Button>
      </div>
    </Modal>
  );
}

interface GitHubDiffManagerProps {
  children: (props: {
    showDiff: (params: { filePath: string; oldContent: string; newContent: string; onConfirm: () => void }) => void;
  }) => React.ReactNode;
}

export function GitHubDiffProvider({ children }: GitHubDiffManagerProps) {
  const [modalData, setModalData] = useState<{
    filePath: string;
    repo: string;
    oldContent: string;
    newContent: string;
    onConfirm: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const showDiff = (params: {
    filePath: string;
    oldContent: string;
    newContent: string;
    onConfirm: () => void;
  }) => {
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';
    setModalData({ ...params, repo });
  };

  const handleConfirm = async () => {
    if (!modalData) return;
    setLoading(true);
    try {
      await modalData.onConfirm();
      message.success('配置已同步到 GitHub');
    } catch {
      message.error('同步失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setModalData(null);
  };

  return (
    <>
      {children({ showDiff })}
      {modalData && (
        <GitHubDiffModal
          filePath={modalData.filePath}
          repo={modalData.repo}
          oldContent={modalData.oldContent}
          newContent={modalData.newContent}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </>
  );
}

export default GitHubDiffModal;
