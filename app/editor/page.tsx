'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import {
  Save, Send, ArrowLeft, Image as ImageIcon, XCircle,
  Bold, Italic, Heading1, Heading2, Link as LinkIcon, Code, Quote, List, ListOrdered, Minus,
  Eye, Columns2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import Link from 'next/link';

type ViewMode = 'edit' | 'split' | 'preview';

const TOOLBAR_ITEMS = [
  { icon: Bold, label: '加粗', prefix: '**', suffix: '**', placeholder: '粗体文字' },
  { icon: Italic, label: '斜体', prefix: '_', suffix: '_', placeholder: '斜体文字' },
  { icon: Heading1, label: '一级标题', prefix: '# ', suffix: '', placeholder: '标题' },
  { icon: Heading2, label: '二级标题', prefix: '## ', suffix: '', placeholder: '标题' },
  { icon: LinkIcon, label: '链接', prefix: '[', suffix: '](url)', placeholder: '链接文字' },
  { icon: Code, label: '代码', prefix: '```\n', suffix: '\n```', placeholder: '代码' },
  { icon: Quote, label: '引用', prefix: '> ', suffix: '', placeholder: '引用文字' },
  { icon: List, label: '无序列表', prefix: '- ', suffix: '', placeholder: '列表项' },
  { icon: ListOrdered, label: '有序列表', prefix: '1. ', suffix: '', placeholder: '列表项' },
  { icon: Minus, label: '分割线', prefix: '\n---\n', suffix: '', placeholder: '' },
];

/** Markdown 工具栏 */
function MarkdownToolbar({ onInsert }: { onInsert: (prefix: string, suffix: string, placeholder: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-zinc-100 bg-zinc-50/80 flex-wrap">
      {TOOLBAR_ITEMS.map((item) => (
        <button
          key={item.label}
          onClick={() => onInsert(item.prefix, item.suffix, item.placeholder)}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
          title={item.label}
          type="button"
        >
          <item.icon size={16} />
        </button>
      ))}
    </div>
  );
}

/** 视图模式切换 */
function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: React.ElementType; label: string }[] = [
    { key: 'edit', icon: Pencil, label: '编辑' },
    { key: 'split', icon: Columns2, label: '分栏' },
    { key: 'preview', icon: Eye, label: '预览' },
  ];

  return (
    <div className="flex items-center bg-zinc-100 rounded-lg p-1 gap-0.5">
      {modes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
          title={label}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

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
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!articleId);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!articleId) return;
    const controller = new AbortController();

    const fetchArticle = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/articles/${articleId}`, { signal: controller.signal });
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
        if (!controller.signal.aborted) {
          console.error(t('editor.fetchFailed'), error);
          showError(t('editor.fetchFailed'));
        }
      } finally {
        setFetching(false);
      }
    };
    void fetchArticle();
    return () => controller.abort();
  }, [articleId, t]);

  useEffect(() => {
    const checkGithubConfig = async () => {
      try {
        const res = await fetch('/api/env-status');
        if (!res.ok) { showError('GitHub 环境变量加载失败'); return; }
        const data = await res.json();
        const githubVars = data.groups?.github?.variables ?? [];
        const repoSet = githubVars.find((v: { name: string; isSet: boolean }) => v.name === 'GITHUB_REPO')?.isSet;
        const tokenSet = githubVars.find((v: { name: string; isSet: boolean }) => v.name === 'GITHUB_TOKEN')?.isSet;
        setGithubConfigured(!!(repoSet && tokenSet));
      } catch (error) {
        console.error('检查 GitHub 配置失败:', error);
        showError('GitHub 配置检查失败');
      }
    };
    void checkGithubConfig();
  }, []);

  const insertMarkdown = useCallback((prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const text = selected || placeholder;
    const newText = content.substring(0, start) + prefix + text + suffix + content.substring(end);
    setContent(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + text.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, [content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const { selectionStart: start, selectionEnd: end } = e.currentTarget;
    setContent((prev) => prev.substring(0, start) + '  ' + prev.substring(end));
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(start + 2, start + 2);
    });
  }, []);

  const buildArticleData = useCallback((action: 'draft' | 'publish') => {
    const autoSlug = `/${user?.name ?? 'anonymous'}/${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '')}`;
    return {
      title,
      content,
      status: action === 'publish' ? 'published' : 'draft',
      slug: action === 'publish' ? (slug ?? autoSlug) : slug,
      authorId: user?.uid ?? '',
      authorName: user?.displayName ?? user?.name ?? 'Anonymous',
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      coverImage,
      description,
    };
  }, [user, title, content, slug, tags, coverImage, description]);

  const handleSubmit = useCallback(async (action: 'draft' | 'publish') => {
    if (!user) { message.warning(t('editor.pleaseLogin')); return; }
    if (!title.trim() || !content.trim()) { message.warning(t('editor.titleContentRequired')); return; }

    setLoading(true);
    try {
      const articleData = buildArticleData(action);
      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      if (res.ok) {
        const successMsg = action === 'publish'
          ? (t('editor.publishSuccess') || '发布成功')
          : (articleId ? t('editor.updateSuccess') : t('editor.saveSuccess'));
        message.success(successMsg);
        router.push('/dashboard/articles');
      } else {
        const data = await res.json();
        showError(`${t('editor.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      showError(t('editor.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, title, content, articleId, t, router, buildArticleData]);

  if (fetching) return <GlobalLoading size="large" />;

  const showEditor = viewMode === 'edit' || viewMode === 'split';
  const showPreview = viewMode === 'preview' || viewMode === 'split';

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 min-h-screen flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <Link href="/dashboard/articles" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft size={20} />
          <span>{t('editor.back')}</span>
        </Link>

        <ViewModeToggle mode={viewMode} onChange={setViewMode} />

        <div className="flex items-center gap-4">
          <Button
            onClick={() => void handleSubmit('draft')}
            disabled={loading}
            loading={loading}
            variant="default"
            size="md"
            icon={<Save size={18} />}
          >
            {loading ? '' : t('editor.saveDraft')}
          </Button>
          {githubConfigured ? (
            <Button
              onClick={() => void handleSubmit('publish')}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="md"
              icon={<Send size={18} />}
            >
              {loading ? '' : t('editor.publish')}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <XCircle size={18} />
              <span className="text-sm">请先配置 GitHub</span>
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
          className="text-4xl md:text-5xl font-display font-bold text-zinc-900 bg-transparent border-none outline-none placeholder:text-zinc-300 w-full"
        />

        {/* Slug / 封面 / 标签 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono">/posts</span>
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
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
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

        {/* Markdown 工具栏 + 内容区域 */}
        <div className="flex-1 flex flex-col border border-zinc-200 rounded-2xl overflow-hidden bg-white min-h-[500px]">
          {showEditor && <MarkdownToolbar onInsert={insertMarkdown} />}

          <div className="flex-1 flex min-h-0">
            {showEditor && (
              <div className={`flex flex-col ${showPreview ? 'w-1/2 border-r border-zinc-100' : 'w-full'}`}>
                <textarea
                  ref={textareaRef}
                  placeholder={t('editor.contentPlaceholder')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full bg-transparent p-6 text-zinc-800 font-mono text-sm resize-none outline-none placeholder:text-zinc-300 leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {showPreview && (
              <div className={`${showEditor ? 'w-1/2' : 'w-full'} overflow-y-auto p-6`}>
                {content ? (
                  <MarkdownRenderer
                    content={content}
                    highlight={{ theme: 'light', copy: true, lang: true, shrink: false, heightLimit: 330, wordWrap: true }}
                  />
                ) : (
                  <div className="text-zinc-300 text-center mt-20">
                    在左侧输入 Markdown 内容，这里将实时显示渲染效果
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
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
