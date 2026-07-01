'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Save, Send, ArrowLeft, Image as ImageIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import Link from 'next/link';

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams?.get('id');
  const { user } = useAuth();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fetching, setFetching] = useState(!!articleId);
  const [githubConfigured, setGithubConfigured] = useState(false);

  useEffect(() => {
    if (articleId) {
      const fetchArticle = async () => {
        setFetching(true);
        try {
          const res = await fetch(`/api/articles/${articleId}`);
          if (res.ok) {
            const data = await res.json();
            setTitle(data.title ?? '');
            setContent(data.content ?? '');
            setTags(data.tags?.join(', ') ?? '');
            setCoverImage(data.coverImage ?? data.cover ?? '');
            setDescription(data.description ?? '');
            setSlug(data.slug ?? '');
          } else {
            showError('文章加载失败');
          }
        } catch (error) {
          console.error(t('editor.fetchFailed'), error);
          showError(t('editor.fetchFailed'));
        } finally {
          setFetching(false);
        }
      };
      void fetchArticle();
    }

    // 检查 GitHub 是否配置
    const checkGithubConfig = async () => {
      try {
        const res = await fetch('/api/env-status');
        if (res.ok) {
          const data = await res.json();
          const githubVars = data.groups?.github?.variables ?? [];
          const repoSet = githubVars.find((v: { name: string; isSet: boolean }) => v.name === 'GITHUB_REPO')?.isSet;
          const tokenSet = githubVars.find((v: { name: string; isSet: boolean }) => v.name === 'GITHUB_TOKEN')?.isSet;
          setGithubConfigured(!!(repoSet && tokenSet));
        } else {
          showError('GitHub 环境变量加载失败');
        }
      } catch (error) {
        console.error('检查 GitHub 配置失败:', error);
        showError('GitHub 配置检查失败');
      }
    };
    void checkGithubConfig();
  }, [articleId, t]);

  /** 生成并校验文章 slug */
  function buildSlug(): string | null {
    const postSlug = slug || `/${user?.name ?? 'anonymous'}/${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '')}`;
    if (!/^\/[\w\u4e00-\u9fa5-]+(\/[\w\u4e00-\u9fa5-]+)*$/.test(postSlug)) {
      showError('文章路径格式无效，仅允许字母、数字、中文、连字符和斜杠');
      return null;
    }
    return postSlug;
  }

  /**
   * 保存草稿到数据库
   */
  const handleSaveDraft = async () => {
    if (!user) { message.warning(t('editor.pleaseLogin')); return; }
    if (!title.trim() || !content.trim()) { message.warning(t('editor.titleContentRequired')); return; }

    setSavingDraft(true);
    try {
      const articleData = {
        title,
        content,
        status: 'draft',
        authorId: user.uid,
        authorName: user.displayName || user.name || 'Anonymous',
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        coverImage,
        description,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      if (res.ok) {
        message.success(articleId ? t('editor.updateSuccess') : t('editor.saveSuccess'));
        router.push('/dashboard/articles');
      } else {
        const data = await res.json();
        showError(`${t('editor.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      showError(t('editor.saveFailed'));
    } finally {
      setSavingDraft(false);
    }
  };

  /**
   * 发布文章：推送到 GitHub posts/ 目录
   */
  const handlePublish = async () => {
    if (!user) { message.warning(t('editor.pleaseLogin')); return; }
    if (!title.trim() || !content.trim()) { message.warning(t('editor.titleContentRequired')); return; }

    setPublishing(true);
    try {
      const postSlug = buildSlug();
      if (!postSlug) { setPublishing(false); return; }

      const articleData = {
        title,
        content,
        status: 'published',
        slug: postSlug,
        authorId: user.uid,
        authorName: user.displayName || user.name || 'Anonymous',
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        coverImage,
        description,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(t('editor.publishSuccess') || '发布成功');
        router.push('/dashboard/articles');
      } else {
        showError(`${t('editor.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      showError(`${t('editor.saveFailed')}: ${error instanceof Error ? error.message : ''}`);
    } finally {
      setPublishing(false);
    }
  };

  if (fetching) return <GlobalLoading size="large" />;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen flex flex-col overflow-hidden">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <Link href="/dashboard/articles" className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0">
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">{t('editor.back')}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            loading={savingDraft}
            variant="default"
            size="md"
            icon={<Save size={18} />}
            className="hidden sm:inline-flex"
          >
            {t('editor.saveDraft')}
          </Button>
          <Button
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            loading={savingDraft}
            variant="default"
            size="md"
            icon={<Save size={18} />}
            className="sm:hidden"
            title={t('editor.saveDraft')}
          />
          {githubConfigured ? (
            <>
              <Button
                onClick={handlePublish}
                disabled={savingDraft || publishing}
                loading={publishing}
                variant="primary"
                size="md"
                icon={<Send size={18} />}
                className="hidden sm:inline-flex"
              >
                {t('editor.publish')}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={savingDraft || publishing}
                loading={publishing}
                variant="primary"
                size="md"
                icon={<Send size={18} />}
                className="sm:hidden"
                title={t('editor.publish')}
              />
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 sm:px-4 py-2 rounded-lg">
              <XCircle size={18} />
              <span className="text-sm hidden sm:inline">请先配置 GitHub</span>
            </div>
          )}
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 flex flex-col gap-6">
        <input
          type="text"
          placeholder={t('editor.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-4xl md:text-5xl font-display font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 w-full"
        />

        {/* Slug / 封面 / 标签 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs font-mono">/posts</span>
            <Input
              type="text"
              placeholder="/category/my-post（留空自动生成）"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              size="md"
              rounded="md"
              ring="strong"
              className="pl-16 pr-4 font-mono"
            />
          </div>
          <div className="flex-1 relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
            <Input
              type="text"
              placeholder={t('editor.coverUrl')}
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              size="md"
              rounded="md"
              ring="strong"
              className="pl-10 px-4"
            />
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder={t('editor.tags')}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              size="md"
              rounded="md"
              ring="strong"
              className="px-4"
            />
          </div>
        </div>

        {/* 描述 */}
        <Input
          type="text"
          placeholder="文章描述（可选，用于列表预览）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="md"
          rounded="md"
          ring="strong"
          className="px-4"
        />

        {/* 内容编辑 */}
        <textarea
          placeholder={t('editor.contentPlaceholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-zinc-800 dark:text-zinc-200 font-mono text-sm resize-none outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors min-h-[300px] max-h-[70vh]"
        />
      </div>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <GlobalLoading size="large" />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent />
    </Suspense>
  );
}
