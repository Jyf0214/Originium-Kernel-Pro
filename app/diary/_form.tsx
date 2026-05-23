'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { showError } from '@/lib/error';
import { useDiaryDraft } from '@/hooks/use-diary-draft';

interface DiaryFormProps {
  mode: 'new' | 'edit';
  draftId: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialDate?: string;
  onSave: (title: string, content: string, tags: string[], date: string) => Promise<string | null>;
}

export default function DiaryForm({ mode: _mode, draftId, initialTitle, initialContent, initialTags, initialDate, onSave }: DiaryFormProps) {
  const [title, setTitle] = React.useState(initialTitle ?? '');
  const [content, setContent] = React.useState(initialContent ?? '');
  const [tags, setTags] = React.useState((initialTags ?? []).join(', '));
  const [diaryDate, setDiaryDate] = React.useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);
  const router = useRouter();

  const { clearDraft } = useDiaryDraft({
    id: draftId,
    title,
    content,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    date: diaryDate,
    onDraftFound: (data) => {
      if (!recovered && (data.title || data.content)) {
        const ok = window.confirm(`检测到上次未完成的草稿（${data.savedAt ? new Date(data.savedAt).toLocaleString('zh-CN') : '未知时间'}），是否恢复？`);
        if (ok) {
          setTitle(data.title ?? '');
          setContent(data.content ?? '');
          setTags((data.tags ?? []).join(', '));
          if (data.date) setDiaryDate(data.date.slice(0, 10));
          setRecovered(true);
        }
      }
    },
  });

  const handleSave = async () => {
    if (!title.trim()) { showError('请输入标题'); return; }
    if (!content.trim()) { showError('请输入内容'); return; }

    setSaving(true);
    try {
      const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await onSave(title.trim(), content.trim(), tagsArr, diaryDate);
      if (result !== null) {
        clearDraft();
        router.push('/diary');
      }
    } catch {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/diary')}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={16} className="sm:size-[18]" />
            <span className="hidden sm:inline">返回日记列表</span>
            <span className="sm:hidden">返回</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="sm:size-4 animate-spin" />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          <input
            type="date"
            value={diaryDate}
            onChange={(e) => setDiaryDate(e.target.value)}
            className="w-full text-base sm:text-lg text-zinc-600 bg-transparent border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="日记标题"
            className="w-full text-2xl sm:text-4xl font-display font-black tracking-tighter text-zinc-900 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（逗号分隔，如：生活, 工作, 随笔）"
            className="w-full text-sm text-zinc-400 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的日记..."
            rows={18}
            className="w-full text-sm sm:text-base text-zinc-900 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none resize-y font-mono leading-relaxed"
          />
        </div>
      </main>
    </div>
  );
}
