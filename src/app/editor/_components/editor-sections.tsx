'use client';

import React from 'react';
import { Save, Send, Image as ImageIcon, XCircle, Settings2, Eye, PencilLine, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LazyMarkdownRenderer } from '@/components/MarkdownRenderer/dynamic';
import { cn } from '@/lib/ui';
import type { TFunc } from '@/i18n/keys';

/** 文章表单字段快照（用于未保存变更检测与自动路径预览） */
export interface ArticleFormData {
  title: string;
  content: string;
  tags: string;
  coverImage: string;
  description: string;
  slug: string;
}

/** 字段区块：label + 说明 + 输入内容 */
function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}

/** 保存状态徽标：未保存变更 / 最近保存时间 */
export function SaveStatusBadge({
  isDirty,
  lastSavedAt,
  t,
}: {
  isDirty: boolean;
  lastSavedAt: Date | null;
  t: TFunc;
}) {
  if (isDirty) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {t('editor.unsavedChanges')}
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="text-zinc-400 dark:text-zinc-500">
        {t('editor.savedAt', { time: lastSavedAt.toLocaleTimeString() })}
      </span>
    );
  }
  return null;
}

/** 顶部操作按钮：保存草稿 / 发布（或 GitHub 未配置警示） */
export function EditorActions({
  savingDraft,
  publishing,
  githubConfigured,
  onSaveDraft,
  onPublish,
  t,
}: {
  savingDraft: boolean;
  publishing: boolean;
  githubConfigured: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  t: TFunc;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      <Button
        onClick={onSaveDraft}
        disabled={savingDraft || publishing}
        loading={savingDraft}
        variant="default"
        size="md"
        icon={<Save size={18} />}
      >
        {t('editor.saveDraft')}
      </Button>
      {githubConfigured ? (
        <Button
          onClick={onPublish}
          disabled={savingDraft || publishing}
          loading={publishing}
          variant="primary"
          size="md"
          icon={<Send size={18} />}
        >
          {t('editor.publish')}
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 sm:px-4 py-2 rounded-lg">
          <XCircle size={18} />
          <span className="text-sm hidden sm:inline">{t('editor.githubNotConfigured')}</span>
        </div>
      )}
    </div>
  );
}

/** 移动端编辑/预览切换 Tab */
export function MobileModeTabs({
  previewMode,
  onModeChange,
  t,
}: {
  previewMode: 'edit' | 'preview';
  onModeChange: (mode: 'edit' | 'preview') => void;
  t: TFunc;
}) {
  return (
    <div className="lg:hidden flex items-center gap-1 ml-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
      <button
        type="button"
        onClick={() => onModeChange('edit')}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
          previewMode === 'edit'
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
            : 'text-zinc-500 dark:text-zinc-400',
        )}
      >
        <PencilLine size={12} />
        {t('editor.edit')}
      </button>
      <button
        type="button"
        onClick={() => onModeChange('preview')}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
          previewMode === 'preview'
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
            : 'text-zinc-500 dark:text-zinc-400',
        )}
      >
        <Eye size={12} />
        {t('editor.preview')}
      </button>
    </div>
  );
}

/** 标题 + 文章设置卡片 */
export function EditorMetaSection({
  form,
  setters,
  autoSlugPreview,
  t,
}: {
  form: ArticleFormData;
  setters: {
    setTitle: (v: string) => void;
    setSlug: (v: string) => void;
    setTags: (v: string) => void;
    setCoverImage: (v: string) => void;
    setDescription: (v: string) => void;
  };
  autoSlugPreview: string | null;
  t: TFunc;
}) {
  return (
    <>
      {/* 标题区 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-6 mb-6">
        <input
          type="text"
          placeholder={t('editor.titlePlaceholder')}
          value={form.title}
          onChange={(e) => setters.setTitle(e.target.value)}
          className="text-3xl md:text-4xl font-display font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 w-full"
        />
      </div>

      {/* 文章设置区 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 size={16} className="text-zinc-400 dark:text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('editor.articleSettings')}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('editor.slugLabel')} hint={form.slug ? undefined : t('editor.slugHint')}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs font-mono">/posts</span>
              <Input
                type="text"
                placeholder={t('editor.slugPlaceholder')}
                value={form.slug}
                onChange={(e) => setters.setSlug(e.target.value)}
                size="md"
                rounded="md"
                ring="strong"
                className="pl-16 pr-4 font-mono"
              />
            </div>
            {autoSlugPreview && (
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500 break-all">
                {t('editor.autoSlug')}: {`/posts${autoSlugPreview}.md`}
              </p>
            )}
          </Field>
          <Field label={t('editor.tagsLabel')} hint={t('editor.tagsHint')}>
            <Input
              type="text"
              placeholder={t('editor.tags')}
              value={form.tags}
              onChange={(e) => setters.setTags(e.target.value)}
              size="md"
              rounded="md"
              ring="strong"
              className="px-4"
            />
          </Field>
          <Field label={t('editor.coverLabel')} hint={t('editor.coverHint')}>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <Input
                type="text"
                placeholder={t('editor.coverUrl')}
                value={form.coverImage}
                onChange={(e) => setters.setCoverImage(e.target.value)}
                size="md"
                rounded="md"
                ring="strong"
                className="pl-10 pr-4"
              />
            </div>
          </Field>
          <Field label={t('editor.descriptionLabel')} hint={t('editor.descriptionHint')}>
            <Input
              type="text"
              placeholder={t('editor.descriptionPlaceholder')}
              value={form.description}
              onChange={(e) => setters.setDescription(e.target.value)}
              size="md"
              rounded="md"
              ring="strong"
              className="px-4"
            />
          </Field>
        </div>
      </div>
    </>
  );
}

/** 正文编辑卡片：移动端 Tab + 字数统计 + 编辑/预览双栏 */
export function EditorBodySection({
  content,
  onContentChange,
  previewMode,
  onModeChange,
  charCount,
  readMinutes,
  t,
}: {
  content: string;
  onContentChange: (v: string) => void;
  previewMode: 'edit' | 'preview';
  onModeChange: (mode: 'edit' | 'preview') => void;
  charCount: number;
  readMinutes: number;
  t: TFunc;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex-1 flex flex-col min-h-[480px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-zinc-400 dark:text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('editor.contentLabel')}</h2>
          <MobileModeTabs previewMode={previewMode} onModeChange={onModeChange} t={t} />
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <span>{t('editor.charCount', { count: charCount })}</span>
          {charCount > 0 && <span>{t('editor.readTime', { minutes: readMinutes })}</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <textarea
          placeholder={t('editor.contentPlaceholder')}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className={cn(
            'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-zinc-800 dark:text-zinc-200 font-mono text-sm resize-none outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors min-h-[300px] lg:min-h-[420px]',
            previewMode === 'edit' ? 'block' : 'hidden',
            'lg:block',
          )}
        />
        <div
          className={cn(
            'overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 min-h-[300px] lg:min-h-[420px]',
            previewMode === 'preview' ? 'block' : 'hidden',
            'lg:block',
          )}
        >
          {content.trim() ? (
            <LazyMarkdownRenderer content={content} />
          ) : (
            <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
              {t('editor.emptyPreview')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}