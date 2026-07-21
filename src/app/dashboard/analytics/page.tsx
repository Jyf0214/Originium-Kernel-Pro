/**
 * 数据分析仪表板
 *
 * /dashboard/analytics
 *
 * 功能：
 * - 显示文章总数、标签总数、日记总数、总字数
 * - 最近 7 天发布趋势柱状图（纯 CSS 实现，无图表库）
 * - 使用已有的 /api/admin/stats API 获取数据
 * - 数据库不可用时显示降级提示
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Tag,
  PenLine,
  Type,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';

/* ---------- 类型定义 ---------- */

interface TagItem {
  name: string;
  count: number;
}

interface RecentPost {
  title: string;
  date: string;
  slug: string;
  wordCount: number;
}

interface AnalyticsData {
  counts: {
    posts: number;
    diary: number;
    faces: number;
    total: number;
  };
  topTags: TagItem[];
  categories: { name: string; count: number }[];
  wordCount: {
    total: number;
    avgPost: number;
  };
  timeline: {
    last7Days: number;
    last30Days: number;
  };
  recentPosts: RecentPost[];
}

/** 每日发布量条目 */
interface DailyBar {
  label: string;
  count: number;
}

/* ---------- 子组件 ---------- */

/** 指标卡片 */
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 hover:shadow-lg hover:shadow-zinc-100 transition-all duration-300 group ui-interactive">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-black text-zinc-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-zinc-400 font-medium">{label}</div>
    </div>
  );
}

/** 纯 CSS 柱状图 */
function BarChart({
  data,
  maxValue,
  height = 160,
}: {
  data: DailyBar[];
  maxValue: number;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
        暂无数据
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((bar, idx) => {
        const barHeight =
          maxValue > 0 ? Math.max((bar.count / maxValue) * 100, bar.count > 0 ? 4 : 0) : 0;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            {/* 数值标签 */}
            {bar.count > 0 && (
              <span className="text-[10px] font-medium text-zinc-500">{bar.count}</span>
            )}
            {/* 柱体 */}
            <div
              className="w-full bg-zinc-900 dark:bg-zinc-100 rounded-t-md transition-all duration-500 hover:bg-zinc-700 dark:hover:bg-zinc-300"
              style={{ height: `${barHeight}%`, minHeight: bar.count > 0 ? 2 : 0 }}
              title={`${bar.label}: ${bar.count} 篇`}
            />
            {/* 日期标签 */}
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate w-full text-center">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 标签分布横向条形图 */
function TagBarChart({
  tags,
  maxCount,
}: {
  tags: TagItem[];
  maxCount: number;
}) {
  if (tags.length === 0) {
    return (
      <div className="text-sm text-zinc-400 dark:text-zinc-500 py-4">
        暂无标签数据
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tags.map((tag) => (
        <div key={tag.name} className="flex items-center gap-3">
          <div
            className="w-20 text-sm text-zinc-600 dark:text-zinc-400 truncate shrink-0"
            title={tag.name}
          >
            {tag.name}
          </div>
          <div className="flex-1 h-5 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500"
              style={{
                width: maxCount > 0 ? `${(tag.count / maxCount) * 100}%` : '0%',
              }}
            />
          </div>
          <div className="w-8 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
            {tag.count}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 页面主体 ---------- */

export default function AnalyticsPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败 (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isSudo) {
      router.push('/dashboard');
    }
  }, [authLoading, isSudo, router]);

  useEffect(() => {
    if (!authLoading && user && isSudo) {
      void fetchData();
    }
  }, [authLoading, user, isSudo, fetchData]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <GlobalLoading size="large" />
      </div>
    );
  }

  if (!isSudo) {
    return null;
  }

  // 构建最近 7 天每日发布量数据
  const buildDailyData = (): DailyBar[] => {
    if (!data?.recentPosts) return [];
    const now = new Date();
    const days: DailyBar[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const shortLabel = `${d.getMonth() + 1}/${d.getDate()}`;

      // 统计当天发布的文章数
      const count = data.recentPosts.filter((p) => {
        const pDate = new Date(p.date);
        const pDateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
        return pDateStr === dateStr;
      }).length;

      days.push({ label: shortLabel, count });
    }
    return days;
  };

  const dailyData = buildDailyData();
  const dailyMax = Math.max(...dailyData.map((d) => d.count), 1);
  const tagMax = data ? Math.max(...data.topTags.map((t) => t.count), 1) : 1;

  return (
    <PageContainer maxWidth="6xl">
      {/* 页面头部 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">数据仪表板</h1>
            <p className="text-zinc-400 text-sm mt-0.5">站点内容数据概览与趋势分析</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchData()}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {/* 加载中 */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <GlobalLoading />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button variant="primary" onClick={() => void fetchData()}>
            重试
          </Button>
        </div>
      )}

      {data && (
        <>
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
            <MetricCard
              icon={FileText}
              label="文章总数"
              value={data.counts.posts}
              color="bg-zinc-900"
            />
            <MetricCard
              icon={Tag}
              label="标签总数"
              value={data.topTags.length}
              color="bg-blue-500"
            />
            <MetricCard
              icon={PenLine}
              label="日记总数"
              value={data.counts.diary}
              color="bg-emerald-500"
            />
            <MetricCard
              icon={Type}
              label="总字数"
              value={data.wordCount.total}
              color="bg-purple-500"
            />
            <MetricCard
              icon={TrendingUp}
              label="7 天发布"
              value={data.timeline.last7Days}
              color="bg-amber-500"
            />
          </div>

          {/* 发布趋势图 */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={16} className="text-zinc-400" />
              <h2 className="text-base font-bold text-zinc-900">最近 7 天发布趋势</h2>
            </div>
            <BarChart data={dailyData} maxValue={dailyMax} height={180} />
          </div>

          {/* 标签分布 */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Tag size={16} className="text-zinc-400" />
              <h2 className="text-base font-bold text-zinc-900">标签分布（Top 10）</h2>
            </div>
            <TagBarChart tags={data.topTags} maxCount={tagMax} />
          </div>

          {/* 辅助统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className="text-xs text-zinc-400 mb-1">全部内容</div>
              <div className="text-2xl font-black text-zinc-900">{data.counts.total}</div>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className="text-xs text-zinc-400 mb-1">30 天发布</div>
              <div className="text-2xl font-black text-zinc-900">{data.timeline.last30Days}</div>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className="text-xs text-zinc-400 mb-1">文章平均字数</div>
              <div className="text-2xl font-black text-zinc-900">
                {data.wordCount.avgPost.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
