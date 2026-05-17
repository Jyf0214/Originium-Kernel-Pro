'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Tag, message } from 'antd';
import { Github, CheckCircle2, Plus, Minus, Pencil } from 'lucide-react';
import yaml from 'js-yaml';

interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

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
  const [diffEntries, setDiffEntries] = useState<DiffEntry[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0, modified: 0 });

  useEffect(() => {
    const computeYamlDiff = () => {
      let oldObj: Record<string, unknown> = {};
      let newObj: Record<string, unknown> = {};
      try {
        oldObj = (yaml.load(oldContent ?? '{}') ?? {}) as Record<string, unknown>;
      } catch {
        oldObj = {};
      }
      try {
        newObj = (yaml.load(newContent ?? '{}') ?? {}) as Record<string, unknown>;
      } catch {
        newObj = {};
      }

      const entries: DiffEntry[] = [];

      const isNonNullObject = (v: unknown): v is Record<string, unknown> =>
        v !== null && typeof v === 'object' && !Array.isArray(v);

      const diffObjectMaps = (oldVal: Record<string, unknown>, newVal: Record<string, unknown>, path: string) => {
        const oldKeys = new Set(Object.keys(oldVal));
        const newKeys = new Set(Object.keys(newVal));
        const allKeys = new Set([...oldKeys, ...newKeys]);

        for (const key of allKeys) {
          const fullPath = path ? `${path}.${key}` : key;
          const ov = oldVal[key];
          const nv = newVal[key];

          if (oldKeys.has(key) && !newKeys.has(key)) {
            entries.push({ path: fullPath, type: 'removed' as const, oldValue: ov });
          } else if (!oldKeys.has(key) && newKeys.has(key)) {
            entries.push({ path: fullPath, type: 'added' as const, newValue: nv });
          } else {
            diffObjects(ov, nv, fullPath);
          }
        }
      };

      const diffArrays = (oldVal: unknown[], newVal: unknown[], path: string) => {
        const oldJson = JSON.stringify(oldVal);
        const newJson = JSON.stringify(newVal);
        if (oldJson !== newJson) {
          entries.push({ path, type: 'modified' as const, oldValue: oldVal, newValue: newVal });
        }
      };

      const diffScalars = (oldVal: unknown, newVal: unknown, path: string) => {
        const ov = typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal;
        const nv = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal;
        if (ov !== nv) {
          entries.push({ path, type: 'modified' as const, oldValue: oldVal, newValue: newVal });
        }
      };

      const diffObjects = (
        oldVal: unknown,
        newVal: unknown,
        path: string,
      ) => {
        if (isNonNullObject(oldVal) && isNonNullObject(newVal)) {
          diffObjectMaps(oldVal, newVal, path);
          return;
        }

        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          diffArrays(oldVal, newVal, path);
          return;
        }

        diffScalars(oldVal, newVal, path);
      };

      diffObjects(oldObj, newObj, '');

      const addedCount = entries.filter(e => e.type === 'added').length;
      const removedCount = entries.filter(e => e.type === 'removed').length;
      const modifiedCount = entries.filter(e => e.type === 'modified').length;

      setDiffEntries(entries);
      setStats({ added: addedCount, removed: removedCount, modified: modifiedCount });
    };

    computeYamlDiff();
  }, [oldContent, newContent]);

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(v => String(v)).join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      width={800}
      footer={null}
      centered
      destroyOnClose
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-200">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Github size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">GitHub 配置变更确认</h2>
            <p className="text-sm text-zinc-500">
              仓库: <span className="font-mono">{repo}</span> · 文件: <span className="font-mono">{filePath}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <Tag icon={<Plus size={12} />} color="success" className="flex items-center gap-1">
            +{stats.added} 新增
          </Tag>
          <Tag icon={<Minus size={12} />} color="error" className="flex items-center gap-1">
            -{stats.removed} 删除
          </Tag>
          <Tag icon={<Pencil size={12} />} color="warning" className="flex items-center gap-1">
            ~{stats.modified} 修改
          </Tag>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 max-h-96 overflow-auto font-mono text-sm">
          {diffEntries.length === 0 && (
            <div className="text-zinc-500 text-center py-4">无变更</div>
          )}
          {diffEntries.map((entry, idx) => (
            <div key={idx} className="mb-2 pb-2 border-b border-zinc-800 last:border-b-0 last:mb-0 last:pb-0">
              <div className={`text-xs font-bold mb-1 ${
                entry.type === 'added' ? 'text-green-400' :
                entry.type === 'removed' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {entry.type === 'added' ? '+ ' : entry.type === 'removed' ? '- ' : '~ '}
                {entry.path}
              </div>
              {entry.type === 'modified' && (
                <div className="pl-4 text-xs">
                  <div className="text-red-400 line-through">{formatValue(entry.oldValue)}</div>
                  <div className="text-green-400">{formatValue(entry.newValue)}</div>
                </div>
              )}
              {entry.type === 'added' && (
                <div className="pl-4 text-xs text-green-400">{formatValue(entry.newValue)}</div>
              )}
              {entry.type === 'removed' && (
                <div className="pl-4 text-xs text-red-400 line-through">{formatValue(entry.oldValue)}</div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={onConfirm}
            className="bg-zinc-900 hover:bg-zinc-800"
            icon={loading ? null : <CheckCircle2 size={14} />}
          >
            {loading ? '提交中...' : '确认提交'}
          </Button>
        </div>
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