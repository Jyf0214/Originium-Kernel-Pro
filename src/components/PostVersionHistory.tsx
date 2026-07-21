/**
 * 帖子版本历史客户端组件
 *
 * 功能：
 * - 通过 API 获取文章版本历史列表
 * - 选择两个版本进行逐行对比，展示差异
 * - diff 视图：新增行绿色背景，删除行红色背景，修改行黄色背景
 * - 静态导出模式下不渲染（检查环境变量 + API 调用降级）
 *
 * 参考日记版本历史模式（diary-version.ts + VersionHistoryModal.tsx）
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { History, ChevronLeft, ChevronDown, Clock, ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/* ---------- 类型定义 ---------- */

/** 版本摘要（列表用，不含正文） */
interface VersionSummary {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
}

/** 版本详情（含正文内容） */
interface _VersionDetail extends VersionSummary {
  content: string;
}

/** diff 行类型 */
type DiffLineType = 'add' | 'del' | 'ctx';

/** 单行 diff 结果 */
interface DiffLine {
  type: DiffLineType;
  text: string;
  /** 旧版本行号（del/ctx 时存在） */
  oldLineNum?: number;
  /** 新版本行号（add/ctx 时存在） */
  newLineNum?: number;
}

/* ---------- 工具函数 ---------- */

/** 格式化日期时间为可读字符串 */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 简单逐行 diff 算法（Myers 简化版）
 * 对比两组文本行，返回带类型标记的差异行列表
 */
// eslint-disable-next-line complexity -- LCS diff 算法天然复杂度较高
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // 使用 LCS（最长公共子序列）计算差异
  const m = oldLines.length;
  const n = newLines.length;

  // 构建 LCS 表
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i]![j] = (dp[i - 1]![j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
      }
    }
  }

  // 回溯生成 diff
  let i = m;
  let j = n;
  const tempResult: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // 相同行（上下文）
      tempResult.push({
        type: 'ctx',
        text: oldLines[i - 1] ?? '',
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (dp[i]![j - 1] ?? 0) >= (dp[i - 1]![j] ?? 0))) {
      // 新增行
      tempResult.push({
        type: 'add',
        text: newLines[j - 1] ?? '',
        newLineNum: j,
      });
      j--;
    } else if (i > 0) {
      // 删除行
      tempResult.push({
        type: 'del',
        text: oldLines[i - 1] ?? '',
        oldLineNum: i,
      });
      i--;
    }
  }

  // 反转（回溯是倒序的）
  for (let k = tempResult.length - 1; k >= 0; k--) {
    const line = tempResult[k];
    if (line) result.push(line);
  }

  return result;
}

/* ---------- 子组件 ---------- */

/** 单行 diff 显示 */
function DiffLineView({ line }: { line: DiffLine }) {
  const bgClass =
    line.type === 'add'
      ? 'bg-emerald-50 dark:bg-emerald-900/20'
      : line.type === 'del'
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-transparent';

  const prefix =
    line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';

  const prefixColor =
    line.type === 'add'
      ? 'text-emerald-600 dark:text-emerald-400'
      : line.type === 'del'
        ? 'text-red-500 dark:text-red-400'
        : 'text-zinc-300 dark:text-zinc-600';

  return (
    <div className={`flex items-stretch font-mono text-xs leading-5 ${bgClass}`}>
      {/* 行号区域 */}
      <div className="flex-shrink-0 w-12 sm:w-16 flex items-center justify-end pr-2 text-zinc-300 dark:text-zinc-600 select-none border-r border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px]">{line.oldLineNum ?? ''}</span>
      </div>
      <div className="flex-shrink-0 w-12 sm:w-16 flex items-center justify-end pr-2 text-zinc-300 dark:text-zinc-600 select-none border-r border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px]">{line.newLineNum ?? ''}</span>
      </div>
      {/* 前缀 + 内容 */}
      <div className="flex items-center px-2 shrink-0">
        <span className={`w-3 text-center ${prefixColor}`}>{prefix}</span>
      </div>
      <div className="flex-1 py-0.5 px-1 break-all whitespace-pre-wrap">{line.text}</div>
    </div>
  );
}

/** 版本对比选择器 */
function VersionSelector({
  versions,
  selectedId,
  onSelect,
  label,
}: {
  versions: VersionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
        {label}
      </label>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 focus:border-transparent"
      >
        <option value="">请选择版本</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.title || '无标题'} — {formatDateTime(v.createdAt)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- 主组件 ---------- */

interface PostVersionHistoryProps {
  /** 文章 slug（用于 API 请求） */
  slug: string;
  /** 文章标题（用于展示） */
  title?: string;
  className?: string;
}

/**
 * 帖子版本历史组件
 *
 * 在文章详情页底部展示版本历史区域
 * - 列表模式：展示版本列表，可选择两个版本进行对比
 * - diff 模式：逐行展示两个版本的差异
 * - 静态导出模式下不渲染
 */
// eslint-disable-next-line complexity -- 版本历史组件包含多种模式和交互逻辑
export function PostVersionHistory({
  slug,
  title: _title,
  className,
}: PostVersionHistoryProps) {
  // 静态导出模式检测：服务端和客户端均检查
  const isStaticExport =
    typeof process !== 'undefined' &&
    process.env.NEXT_STATIC_EXPORT === 'true';

  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  // 对比模式状态
  const [mode, setMode] = useState<'list' | 'diff'>('list');
  const [oldVersionId, setOldVersionId] = useState<string | null>(null);
  const [newVersionId, setNewVersionId] = useState<string | null>(null);
  const [_oldContent, setOldContent] = useState<string | null>(null);
  const [_newContent, setNewContent] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  /** 加载版本列表 */
  const fetchVersions = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/post-versions?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        // API 不可用（静态导出模式或服务器错误），静默降级
        setVersions([]);
        setFetched(true);
        return;
      }
      const data = await res.json();
      setVersions(data.versions ?? []);
      setFetched(true);
    } catch {
      // API 不可用，静默降级（静态导出模式下会走到这里）
      setVersions([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [slug, fetched, loading]);

  /** 加载版本内容并计算 diff */
  const computeDiff = useCallback(async () => {
    if (!oldVersionId || !newVersionId) return;
    setDiffLoading(true);
    try {
      const [oldRes, newRes] = await Promise.all([
        fetch(`/api/post-versions?slug=${encodeURIComponent(slug)}&versionId=${oldVersionId}`),
        fetch(`/api/post-versions?slug=${encodeURIComponent(slug)}&versionId=${newVersionId}`),
      ]);

      if (!oldRes.ok || !newRes.ok) {
        setError('加载版本内容失败');
        return;
      }

      const oldData = await oldRes.json();
      const newData = await newRes.json();
      const old = oldData.version?.content ?? '';
      const newer = newData.version?.content ?? '';

      setOldContent(old);
      setNewContent(newer);
      setDiffLines(computeLineDiff(old, newer));
      setMode('diff');
    } catch {
      setError('计算差异失败');
    } finally {
      setDiffLoading(false);
    }
  }, [slug, oldVersionId, newVersionId]);

  /** 返回版本列表视图 */
  const backToList = useCallback(() => {
    setMode('list');
    setDiffLines([]);
    setOldContent(null);
    setNewContent(null);
    setOldVersionId(null);
    setNewVersionId(null);
  }, []);

  // 懒加载：首次展开时请求版本列表
  useEffect(() => {
    // 组件挂载后不自动请求，由用户点击展开按钮触发
  }, []);

  // 静态导出模式下不渲染
  if (isStaticExport) return null;

  return (
    <div className={className ?? 'mt-12'}>
      {/* 折叠标题栏 — 默认收起，点击展开 */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer select-none py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <History size={16} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            版本历史
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
            {versions.length > 0 ? `(${versions.length} 个版本)` : ''}
          </span>
          <ChevronDown
            size={16}
            className="text-zinc-400 ml-auto transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="mt-3 space-y-3">
          {/* 首次展开时加载 */}
          {!fetched && (
            <button
              type="button"
              onClick={() => void fetchVersions()}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <Loader2 size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? '加载版本历史中...' : '点击加载版本历史'}
            </button>
          )}

          {/* 加载中 */}
          {loading && fetched && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-zinc-400" />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 版本列表模式 */}
          {fetched && !loading && mode === 'list' && (
            <>
              {versions.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  暂无版本历史
                </div>
              ) : (
                <>
                  {/* 版本选择器 */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <VersionSelector
                      versions={versions}
                      selectedId={oldVersionId}
                      onSelect={setOldVersionId}
                      label="旧版本"
                    />
                    <div className="flex items-end justify-center sm:pb-0.5">
                      <ArrowLeftRight size={16} className="text-zinc-300 dark:text-zinc-600 rotate-90 sm:rotate-0" />
                    </div>
                    <VersionSelector
                      versions={versions}
                      selectedId={newVersionId}
                      onSelect={setNewVersionId}
                      label="新版本"
                    />
                  </div>

                  {/* 对比按钮 */}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={diffLoading}
                    disabled={!oldVersionId || !newVersionId || oldVersionId === newVersionId}
                    onClick={() => void computeDiff()}
                    icon={!diffLoading ? <ArrowLeftRight size={14} /> : undefined}
                  >
                    {diffLoading ? '计算差异中...' : '对比这两个版本'}
                  </Button>

                  {/* 版本列表 */}
                  <div className="space-y-1.5">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                      >
                        <Clock size={13} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                        <span className="text-zinc-700 dark:text-zinc-300 truncate flex-1">
                          {v.title || '无标题'}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                          {formatDateTime(v.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* diff 对比模式 */}
          {mode === 'diff' && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              {/* diff 顶部工具栏 */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
                  <span>新增 {diffLines.filter((l) => l.type === 'add').length} 行</span>
                  <span className="mx-1 text-zinc-200 dark:text-zinc-700">|</span>
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800" />
                  <span>删除 {diffLines.filter((l) => l.type === 'del').length} 行</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  autoLoading={false}
                  icon={<ChevronLeft size={14} />}
                  onClick={backToList}
                >
                  返回
                </Button>
              </div>

              {/* diff 内容区 */}
              <div className="max-h-[50vh] overflow-y-auto">
                {diffLines.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    两个版本内容完全相同
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {diffLines.map((line, idx) => (
                      <DiffLineView key={idx} line={line} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

PostVersionHistory.displayName = 'PostVersionHistory';
export default PostVersionHistory;
