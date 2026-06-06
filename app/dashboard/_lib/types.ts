import type { ComponentType } from 'react';

/** 仪表盘文章统计 */
export interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pendingDeletion: number;
}

/** 最近文章列表项(精简字段) */
export interface RecentArticle {
  id: string;
  title: string;
  status: string;
  slug?: string;
  updatedAt: string;
}

/** /api/articles 返回的原始文章结构 */
export interface Article {
  id?: string;
  title: string;
  status: string;
  slug?: string;
  updatedAt?: string;
  date?: string;
}

/** 统计卡趋势方向 */
export type StatTrendDirection = 'up' | 'down';

/** 统计卡趋势信息 */
export interface StatTrend {
  rate: number;
  direction: StatTrendDirection;
  label: string;
}

/** 统计卡进度条 */
export interface StatProgress {
  value: number;
  color: string;
}

/** 单个统计卡片数据(由 useStatCards 产出) */
export interface StatCardData {
  title: string;
  value: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
  textColor: string;
  trend?: StatTrend;
  progress?: StatProgress;
}

/** 快捷操作项 */
export interface QuickAction {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  href: string;
  desc: string;
}
