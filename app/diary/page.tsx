'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';

interface DiaryEntry {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function DiaryPage() {
  const [diaries, setDiaries] = React.useState<DiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [viewingId, setViewingId] = React.useState<string | null>(null);
  const [viewContent, setViewContent] = React.useState<string>('');
  const [viewLoading, setViewLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [formTitle, setFormTitle] = React.useState('');
  const [formContent, setFormContent] = React.useState('');
  const [formTags, setFormTags] = React.useState('');

  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  function buildQuery() {
    const params = new URLSearchParams();
    if (searchText.trim()) params.set('search', searchText.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return '/api/diary' + (qs ? '?' + qs : '');
  }

  async function fetchDiaries() {
    try {
      const res = await fetch(buildQuery());
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setDiaries(Array.isArray(json.diaries) ? json.diaries : []);
    } catch {
      showError('日记列表加载失败');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
      return;
    }
    void fetchDiaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSudo, authLoading, router]);

  function openCreate() {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setShowForm(true);
  }

  function openEdit(d: DiaryEntry) {
    setEditingId(d.id);
    setFormTitle(d.title);
    setFormContent(d.content ?? '');
    setFormTags((d.tags ?? []).join(', '));
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) { showError('请输入标题'); return; }
    if (!formContent.trim()) { showError('请输入内容'); return; }
    setSaving(true);
    try {
      const tags = formTags.split(',').map(t => t.trim()).filter(Boolean);
      const url = editingId ? '/api/diary/' + editingId : '/api/diary';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle.trim(), content: formContent.trim(), tags }),
      });
      if (!res.ok) throw new Error('保存失败');
      setShowForm(false);
      setSaving(false);
      await fetchDiaries();
    } catch {
      showError('保存失败');
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch('/api/diary/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      if (viewingId === id) { setViewingId(null); setViewContent(''); }
      await fetchDiaries();
    } catch {
      showError('删除失败');
    } finally {
      setDeleting(null);
    }
  }

  async function handleView(d: DiaryEntry) {
    if (viewingId === d.id) {
      setViewingId(null);
      setViewContent('');
      return;
    }
    setViewLoading(true);
    setViewingId(d.id);
    try {
      const res = await fetch('/api/diary/' + d.id);
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setViewContent(json.diary?.content ?? '');
    } catch {
      showError('加载日记内容失败');
      setViewingId(null);
    } finally {
      setViewLoading(false);
    }
  }

  if (authLoading) return <GlobalLoading />;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-zinc-900 mb-2">私密日记</h1>
            <p className="text-zinc-400 text-lg">仅管理员可查看 · 全部存储于数据库</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
          >+ 新建日记</button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索日记标题、内容、标签..."
            className="flex-1 min-w-[200px] max-w-sm px-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400 text-sm"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2.5 border border-zinc-200 rounded-xl text-zinc-900 text-sm"
            title="开始日期"
          />
          <span className="text-zinc-400 text-sm">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2.5 border border-zinc-200 rounded-xl text-zinc-900 text-sm"
            title="结束日期"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        ) : diaries.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-2xl border border-zinc-100">
            <p className="text-zinc-400 text-lg mb-4">暂无日记</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
            >+ 写下第一篇日记</button>
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="p-6 cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => handleView(d)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-zinc-900 mb-2">{d.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                        <span>创建 {formatDate(d.createdAt)}</span>
                        {d.updatedAt !== d.createdAt && <span className="text-zinc-300">更新 {formatDate(d.updatedAt)}</span>}
                        {d.tags.length > 0 && <span>{d.tags.join(', ')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(d)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">编辑</button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deleting === d.id}
                        className="px-3 py-1.5 text-sm text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >{deleting === d.id ? '删除中...' : '删除'}</button>
                      <span className="text-sm text-zinc-300">{viewingId === d.id ? '收起' : '展开'}</span>
                    </div>
                  </div>
                </div>
                {viewingId === d.id && (
                  <div className="border-t border-zinc-100 px-6 py-5">
                    {viewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="prose prose-zinc max-w-none whitespace-pre-wrap">{viewContent}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">{editingId ? '编辑日记' : '新建日记'}</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">标题</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="日记标题"
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">内容 (Markdown)</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="写下你的日记..."
                    rows={12}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400 resize-y font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">标签 (逗号分隔)</label>
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="生活, 工作, 随笔"
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-zinc-600 hover:text-zinc-900 font-medium transition-colors">取消</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
                  >{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
