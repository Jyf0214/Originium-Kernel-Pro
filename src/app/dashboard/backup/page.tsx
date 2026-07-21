/**
 * 备份与导出页面
 *
 * /dashboard/backup
 *
 * 功能：
 * - 导出所有文章为 Markdown 文件（逐文件下载）
 * - 复制所有文章 Markdown 到剪贴板
 * - 显示文章导出状态和进度
 * - 不引入新依赖，使用浏览器原生 API
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import {
  Download,
  ClipboardCopy,
  CheckCircle2,
  FileText,
  AlertCircle,
  Archive,
} from 'lucide-react';

/* ---------- 类型定义 ---------- */

/** 文章列表项 */
interface Article {
  id?: string;
  title: string;
  status: string;
  slug?: string;
  date?: string;
  updatedAt?: string;
  tags?: string[];
}

/** 文章详情（含正文内容） */
interface ArticleDetail extends Article {
  content?: string;
}

/* ---------- 工具函数 ---------- */

/** 清理文件名中的非法字符 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

/** 触发浏览器文件下载 */
function downloadFile(filename: string, content: string, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 短暂延迟（避免浏览器同时触发太多下载） */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------- 页面主体 ---------- */

export default function BackupPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 导出状态
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  /** 加载文章列表 */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/articles');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败 (${res.status})`);
      }
      const data: unknown = await res.json();
      const list = Array.isArray(data) ? (data as Article[]) : [];
      // 只保留已发布文章
      setArticles(list.filter((a) => a.status === 'published'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章列表失败');
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
      void fetchArticles();
    }
  }, [authLoading, user, isSudo, fetchArticles]);

  /** 逐个下载文章 Markdown 文件 */
  const handleExportFiles = useCallback(async () => {
    if (articles.length === 0) return;
    setExporting(true);
    setExportProgress({ done: 0, total: articles.length });

    try {
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        if (!article) continue;
        setExportProgress({ done: i, total: articles.length });

        // 获取文章详情（含正文）
        try {
          const res = await fetch(`/api/articles/${encodeURIComponent(article.id ?? article.slug ?? '')}`);
          if (res.ok) {
            const detail: ArticleDetail = await res.json();
            const content = detail.content ?? '';
            const filename = `${sanitizeFilename(article.title)}.md`;
            downloadFile(filename, content);
          }
        } catch {
          // 单篇文章导出失败不影响后续
        }

        // 间隔 200ms 避免浏览器限制
        if (i < articles.length - 1) {
          await delay(200);
        }
      }
      setExportProgress({ done: articles.length, total: articles.length });
    } finally {
      setExporting(false);
    }
  }, [articles]);

  /** 复制所有文章到剪贴板 */
  const handleCopyAll = useCallback(async () => {
    if (articles.length === 0) return;
    setCopying(true);
    setCopySuccess(false);

    try {
      const parts: string[] = [];

      for (const article of articles) {
        try {
          const res = await fetch(`/api/articles/${encodeURIComponent(article.id ?? article.slug ?? '')}`);
          if (res.ok) {
            const detail: ArticleDetail = await res.json();
            const content = detail.content ?? '';
            // 组装为带有标题分隔的 Markdown 文本
            parts.push(`# ${article.title}\n\n${content}`);
          }
        } catch {
          parts.push(`# ${article.title}\n\n（内容获取失败）`);
        }
      }

      const fullText = parts.join('\n\n---\n\n');
      await navigator.clipboard.writeText(fullText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      setError('复制到剪贴板失败');
    } finally {
      setCopying(false);
    }
  }, [articles]);

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

  return (
    <PageContainer maxWidth="4xl">
      {/* 页面头部 */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          <Archive size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">备份与导出</h1>
          <p className="text-zinc-400 text-sm mt-0.5">导出文章内容用于备份或迁移</p>
        </div>
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <GlobalLoading />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {!loading && (
        <>
          {/* 统计信息 */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-6">
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-600">
                共 <span className="font-bold text-zinc-900">{articles.length}</span> 篇已发布文章可导出
              </span>
            </div>
          </div>

          {/* 操作卡片 */}
          <div className="space-y-4">
            {/* 逐文件下载 */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-zinc-900 mb-1">逐文件下载</h3>
                  <p className="text-sm text-zinc-400">
                    逐个下载每篇文章的 Markdown 文件，每篇文章保存为独立的 .md 文件
                  </p>
                  {exporting && exportProgress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>正在导出...</span>
                        <span>
                          {exportProgress.done} / {exportProgress.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${exportProgress.total > 0 ? (exportProgress.done / exportProgress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="md"
                  loading={exporting}
                  disabled={articles.length === 0}
                  onClick={() => void handleExportFiles()}
                  icon={!exporting ? <Download size={16} /> : undefined}
                >
                  {exporting
                    ? `导出中 (${exportProgress.done}/${exportProgress.total})`
                    : `下载 ${articles.length} 个文件`}
                </Button>
              </div>
            </div>

            {/* 复制到剪贴板 */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-zinc-900 mb-1">复制到剪贴板</h3>
                  <p className="text-sm text-zinc-400">
                    将所有文章内容合并后复制到剪贴板，适合粘贴到其他编辑器
                  </p>
                  {copySuccess && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 size={14} />
                      <span>已复制到剪贴板</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="default"
                  size="md"
                  loading={copying}
                  disabled={articles.length === 0}
                  onClick={() => void handleCopyAll()}
                  icon={!copying ? <ClipboardCopy size={16} /> : undefined}
                >
                  {copying ? '复制中...' : '复制全部'}
                </Button>
              </div>
            </div>
          </div>

          {/* 文章列表预览 */}
          {articles.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
                <h3 className="text-sm font-medium text-zinc-500">文章列表</h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {articles.map((article) => (
                  <div
                    key={article.id ?? article.slug}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50/50 transition-colors"
                  >
                    <FileText size={14} className="text-zinc-300 shrink-0" />
                    <span className="text-sm text-zinc-700 truncate flex-1">
                      {article.title}
                    </span>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {article.date
                        ? new Date(article.date).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
