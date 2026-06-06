import { BookOpen, PenLine, Trash2 } from 'lucide-react';

import type { QuickAction } from './types';

/** 构造仪表盘快捷操作列表(写文章 / 文章管理 / 回收站) */
export function useQuickActions(t: (key: string) => string): QuickAction[] {
  return [
    { label: t('sidebar.writeArticle'), icon: PenLine, href: '/editor', desc: t('dashboard.writeArticleDesc') },
    { label: t('sidebar.articleManagement'), icon: BookOpen, href: '/dashboard/articles', desc: t('dashboard.articleManagementDesc') },
    { label: t('sidebar.recycleBin'), icon: Trash2, href: '/dashboard/articles?status=pending_deletion', desc: t('dashboard.recycleBinDesc') },
  ];
}
