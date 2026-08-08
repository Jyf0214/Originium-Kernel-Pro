'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { isI18nKey, type TFunc } from '@/i18n/keys';

/** 单个环境变量的声明状态（与 /api/env-status 响应结构一致） */
interface EnvVariable {
  name: string;
  isSet: boolean;
  required: boolean;
  descriptionKey: string;
  systemInjected?: boolean;
}

/** 环境变量分组（数据库 / 认证 / 存储等） */
interface EnvGroup {
  name: string;
  nameKey: string;
  descriptionKey: string;
  variables: EnvVariable[];
}

/** 环境变量状态 API 完整响应 */
interface EnvStatusResponse {
  groups: Record<string, EnvGroup>;
  summary: {
    total: number;
    set: number;
    required: number;
    requiredSet: number;
    optional: number;
    optionalSet: number;
    missingRequired: string[];
    isReady: boolean;
  };
}

/** 请求超时：10 秒无响应视为失败 */
const FETCH_TIMEOUT_MS = 10_000;

/** API 返回的动态 i18n 键：非法键回退为原文本（避免 lookup 返回键名） */
function safeT(t: TFunc, key: string, params?: Record<string, string | number>): string {
  return isI18nKey(key) ? t(key, params) : key;
}

/** 一键复制（错误信息等文本），剪贴板不可用时静默忽略 */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 剪贴板权限不可用时忽略
  }
}

/** 统计数值色调映射 */
const TONE_TEXT: Record<string, string> = {
  zinc: 'text-zinc-700 dark:text-zinc-200',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
};

/** 状态徽标（已设置 / 未设置） */
function StatusBadge({ isSet, t }: { isSet: boolean; t: TFunc }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        isSet
          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
          : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 border-red-200 dark:border-red-700/50'
      }`}
    >
      {isSet ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {isSet ? t('env.set') : t('env.notSet')}
    </span>
  );
}

/** 单个变量行：名称 + 状态徽标 + 必选/可选/自动注入标记 + 说明 */
function VariableRow({ variable, t }: { variable: EnvVariable; t: TFunc }) {
  return (
    <li className="py-3 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <code className="text-[13px] font-mono font-semibold text-zinc-800 dark:text-zinc-100 break-all">
          {variable.name}
        </code>
        <StatusBadge isSet={variable.isSet} t={t} />
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded border ${
            variable.required
              ? 'text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20'
              : 'text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60'
          }`}
        >
          {variable.required ? t('env.required') : t('env.optional')}
        </span>
        {variable.systemInjected && (
          <span
            title={t('env.ui.systemInjectedHint')}
            className="text-[11px] px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300"
          >
            {t('env.ui.systemInjected')}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">{safeT(t, variable.descriptionKey)}</p>
    </li>
  );
}

/** 分组卡片：组头（名称 + 就绪状态 + 描述）+ 可折叠变量列表 */
function EnvGroupCard({
  group,
  expanded,
  onToggle,
  t,
}: {
  group: EnvGroup;
  expanded: boolean;
  onToggle: () => void;
  t: TFunc;
}) {
  const missing = group.variables.filter((v) => !v.isSet);
  const allReady = group.variables.length > 0 && missing.length === 0;

  return (
    <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{safeT(t, group.nameKey)}</h3>
            {allReady ? (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                {t('env.ui.allReady')}
              </span>
            ) : (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 border border-red-200 dark:border-red-700/50">
                {t('env.ui.missingCount', { count: missing.length })}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">{safeT(t, group.descriptionKey)}</p>
        </div>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <ul className="px-4 pb-2">
          {group.variables.map((v) => (
            <VariableRow key={v.name} variable={v} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** 顶部统计条：总变量 / 已设置 / 必需缺失 / 可选缺失 */
function StatusStrip({ summary, t }: { summary: EnvStatusResponse['summary']; t: TFunc }) {
  const optionalMissing = summary.optional - summary.optionalSet;
  const items = [
    { label: t('env.summary.total'), value: summary.total, tone: 'zinc' },
    { label: t('env.summary.set'), value: summary.set, tone: 'emerald' },
    {
      label: t('env.summary.requiredMissing'),
      value: summary.missingRequired.length,
      tone: summary.missingRequired.length > 0 ? 'red' : 'emerald',
    },
    { label: t('env.summary.optionalMissing'), value: optionalMissing, tone: optionalMissing > 0 ? 'red' : 'emerald' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-sm"
        >
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.label}</p>
          <p className={`mt-0.5 text-xl font-black tabular-nums ${TONE_TEXT[item.tone]}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** 加载态：居中转圈 */
function LoadingBlock() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="w-8 h-8 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 dark:border-t-zinc-300 animate-spin" />
      <p className="text-sm text-zinc-400">Loading...</p>
    </div>
  );
}

/** 错误横幅：具体错误信息 + 一键复制 + 重试 */
function ErrorBanner({
  message,
  retrying,
  onRetry,
  t,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
  t: TFunc;
}) {
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">{t('env.loadFailed')}</p>
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80 break-all">
            {t('env.fetchFailed')}：{message}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyText(`[env-status] ${message}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
        >
          <Copy size={12} />
          {t('components.markdown.copy')}
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
          {t('env.refresh')}
        </button>
      </div>
    </div>
  );
}

export default function EnvStatusPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isRoot, loading: authLoading } = useAuth();

  const [groups, setGroups] = useState<Record<string, EnvGroup>>({});
  const [summary, setSummary] = useState<EnvStatusResponse['summary'] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const redirectRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      setLoading(true);
      const res = await fetch('/api/env-status', { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as EnvStatusResponse;
      setGroups(data.groups);
      setSummary(data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isRoot && !redirectRef.current) {
      redirectRef.current = true;
      router.push('/');
      return;
    }
    if (isRoot) void fetchStatus();
  }, [authLoading, isRoot, router, fetchStatus]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => setCollapsed(new Set(Object.keys(groups))), [groups]);

  if (authLoading || loading) {
    return <LoadingBlock />;
  }
  if (!isRoot) {
    return null;
  }
  if (error || !summary) {
    return <ErrorBanner message={error ?? 'unknown'} retrying={loading} onRetry={() => void fetchStatus()} t={t} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{t('env.title')}</h1>
            <p className="mt-1 text-sm text-zinc-400">{t('env.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                summary.isReady
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 border-red-200 dark:border-red-700/50'
              }`}
            >
              {summary.isReady ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {summary.isReady ? t('env.ready') : t('env.notReady')}
            </span>
            <button
              type="button"
              onClick={() => void fetchStatus()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t('env.refresh')}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
          >
            {t('env.ui.expandAll')}
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
          >
            {t('env.ui.collapseAll')}
          </button>
        </div>
      </header>

      <StatusStrip summary={summary} t={t} />

      {!summary.isReady && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">{t('env.redeployHint')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {Object.entries(groups).map(([key, group]) => (
          <EnvGroupCard
            key={key}
            group={group}
            expanded={!collapsed.has(key)}
            onToggle={() => toggleGroup(key)}
            t={t}
          />
        ))}
      </div>

      <footer className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm">
        <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">{t('env.tip')}</p>
      </footer>
    </div>
  );
}