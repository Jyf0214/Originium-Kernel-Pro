'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Edit, Trash2, Plus, Eye, RotateCcw, Globe, FileEdit, ArrowRight, Search,
} from 'lucide-react';
import { Button, Input, Tag, Spin, Popconfirm, message } from 'antd';

interface ArticleItem {
  id: string;
  slug?: string;
  title: string;
  author?: string;
  date?: string;
  tags?: string[];
  cover?: string;
  description?: string;
  status: 'published' | 'draft' | 'pending_deletion';
}

export default function ArticlesPage() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const status = searchParams?.get('status');
  const isRecycleBin = status === 'pending_deletion';

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          const filtered = isRecycleBin
            ? data.filter((a: ArticleItem) => a.status === 'pending_deletion')
            : data.filter((a: ArticleItem) => a.status !== 'pending_deletion');
          setArticles(filtered);
        }
      } catch (error) {
        console.error('获取文章列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [user, isRecycleBin]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
        message.success(t('common.success'));
      }
    } catch {
      message.error(t('common.error'));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
        message.success(t('common.success'));
      }
    } catch {
      message.error(t('common.error'));
    }
  };

  const filteredArticles = articles.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spin size="large" tip={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            {isRecycleBin
              ? t('sidebar.recycleBin')
              : t('sidebar.articleManagement')}
          </h1>
          {isRecycleBin && (
            <p className="text-zinc-400 text-sm mt-1">
              {t('dashboard.recycleBinHint') || t('dashboard.recycleBinDesc')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
            <Input
              placeholder={t('common.searchArticles') || t('article.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl w-52"
              size="middle"
            />
          </div>
          {!isRecycleBin && (
            <Link href="/editor">
              <Button type="primary" icon={<Plus size={14} />} className="bg-zinc-900 rounded-xl h-10">
                {t('sidebar.writeArticle')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-500 uppercase tracking-wider">
          <div className="col-span-5">{t('common.title')}</div>
          <div className="col-span-2">{t('common.status')}</div>
          <div className="col-span-2">{t('common.author')}</div>
          <div className="col-span-3 text-right">{t('common.actions')}</div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {filteredArticles.map((article) => (
              <div key={article.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/50 transition-colors">
                {/* 标题 */}
                <div className="col-span-5 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 truncate">{article.title}</div>
                  {article.description && (
                    <div className="text-xs text-zinc-400 truncate mt-0.5">{article.description}</div>
                  )}
                </div>

                {/* 状态 */}
                <div className="col-span-2">
                  <Tag
                    color={
                      article.status === 'published' ? 'success'
                      : article.status === 'pending_deletion' ? 'error'
                      : 'warning'
                    }
                    className="rounded-lg text-xs"
                    icon={
                      article.status === 'published' ? <Globe size={10} />
                      : article.status === 'pending_deletion' ? <Trash2 size={10} />
                      : <FileEdit size={10} />
                    }
                  >
                    {article.status === 'published'
                      ? t('article.published')
                      : article.status === 'pending_deletion'
                      ? t('article.pendingDeletion')
                      : t('article.draft')}
                  </Tag>
                </div>

                {/* 作者 */}
                <div className="col-span-2 text-sm text-zinc-500 truncate">
                  {article.author || '—'}
                </div>

                {/* 操作 */}
                <div className="col-span-3 flex items-center gap-2 justify-end">
                  {isRecycleBin ? (
                    <>
                      <Button
                        size="small"
                        icon={<RotateCcw size={13} />}
                        onClick={() => handleRestore(article.id)}
                        className="rounded-lg text-emerald-600 border-emerald-200 hover:border-emerald-400"
                      >
                        {t('common.restore') || 'Restore'}
                      </Button>
                      <Popconfirm
                        title={t('article.permanentlyDeleteConfirm') || t('article.deleteConfirm')}
                        onConfirm={() => handleDelete(article.id)}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger icon={<Trash2 size={13} />} className="rounded-lg">
                          {t('common.permanentlyDelete') || 'Delete'}
                        </Button>
                      </Popconfirm>
                    </>
                  ) : (
                    <>
                      {article.status === 'published' && article.slug && (
                        <Link href={`/posts${article.slug}`}>
                          <Button size="small" icon={<Eye size={13} />} className="rounded-lg">
                            {t('common.view')}
                          </Button>
                        </Link>
                      )}
                      <Link href={`/editor?id=${article.id}`}>
                        <Button size="small" icon={<Edit size={13} />} className="rounded-lg">
                          {t('common.edit')}
                        </Button>
                      </Link>
                      <Popconfirm
                        title={t('article.deleteConfirm')}
                        onConfirm={() => handleDelete(article.id)}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger icon={<Trash2 size={13} />} className="rounded-lg" />
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-zinc-400">
              {isRecycleBin
                ? t('dashboard.recycleBinEmpty') || 'Recycle bin is empty'
                : t('dashboard.noArticles')}
            </p>
            {!isRecycleBin && (
              <Link href="/editor" className="mt-4 inline-block">
                <Button type="primary" icon={<Plus size={14} />} className="bg-zinc-900 rounded-xl mt-4">
                  {t('dashboard.writeFirstArticle')}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
