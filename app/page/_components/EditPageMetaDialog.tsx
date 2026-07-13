'use client';

/**
 * 页面元数据编辑弹窗
 *
 * 编辑标题、描述、封面图 URL、标签等元数据字段。
 * 打开时从 API 读取现有 meta.json 填充表单，保存时 PUT 回去。
 */
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { modalContentVariants, modalTransition } from '@/components/ui/motion';
import { X, Loader2, Loader } from 'lucide-react';
import { readPageMeta, writePageMeta } from '@/lib/page-meta';
import type { PageMeta } from '@/lib/page-source/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EditPageMetaDialogProps {
  open: boolean;
  page: { filename: string; folder?: string };
  onClose: () => void;
  onSaved: () => void;
}

/* ---------- 子组件 ---------- */

function DialogHeader({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="text-base font-semibold text-zinc-900">编辑页面元数据</h2>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-40"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 ring-1 ring-red-200">
      <p className="text-sm text-red-700 flex-1 break-all">{message}</p>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(message)}
        className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
      >
        复制
      </button>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
      <p className="text-sm text-emerald-700 flex-1">{message}</p>
    </div>
  );
}

function DialogFooter({ onClose, onSubmit, submitting, loading }: {
  onClose: () => void; onSubmit: () => void; submitting: boolean; loading: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 bg-zinc-50 border-t border-zinc-100 rounded-b-2xl">
      <Button variant="default" size="sm" onClick={onClose} disabled={submitting || loading} autoLoading={false}>
        取消
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSubmit}
        loading={submitting}
        disabled={submitting || loading}
        icon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
      >
        {submitting ? '保存中...' : '保存'}
      </Button>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function EditPageMetaDialog({ open, page, onClose, onSaved }: EditPageMetaDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 打开弹窗时加载现有元数据
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    readPageMeta(page.folder, page.filename)
      .then((meta) => {
        if (cancelled) return;
        if (meta) {
          setTitle(meta.title ?? '');
          setDescription(meta.description ?? '');
          setCoverImage(meta.coverImage ?? '');
          setTagsInput(meta.tags?.join(', ') ?? '');
        } else {
          setTitle('');
          setDescription('');
          setCoverImage('');
          setTagsInput('');
        }
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('读取元数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, page.folder, page.filename]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setCoverImage('');
      setTagsInput('');
      setLoading(false);
      setSubmitting(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [open]);

  const parseTags = useCallback((input: string): string[] => {
    return input
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, []);

  const handleSave = useCallback(async () => {
    if (submitting || loading) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const meta: PageMeta = {
      title: title.trim(),
      description: description.trim(),
      coverImage: coverImage.trim(),
      tags: parseTags(tagsInput),
    };

    try {
      await writePageMeta(page.folder, page.filename, meta);
      setSuccessMsg('元数据已保存');
      onSaved();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, coverImage, tagsInput, page.folder, page.filename, submitting, loading, parseTags, onSaved, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !submitting && !successMsg) onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !submitting && !loading) void handleSave();
  }, [submitting, successMsg, loading, onClose, handleSave]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={submitting || !!successMsg ? undefined : onClose}
          />

          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200"
          >
            <DialogHeader onClose={onClose} disabled={submitting || !!successMsg} />

            <div className="px-5 pb-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-zinc-400">
                  <Loader size={20} className="animate-spin mr-2" />
                  <span className="text-sm">加载中...</span>
                </div>
              ) : (
                <>
                  <Input
                    label="标题"
                    placeholder="页面标题（可选）"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    size="sm"
                    disabled={submitting}
                  />

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">描述</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="页面描述（可选）"
                      rows={3}
                      disabled={submitting}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 resize-none"
                    />
                  </div>

                  <Input
                    label="封面图 URL"
                    placeholder="https://example.com/image.jpg"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    size="sm"
                    disabled={submitting}
                  />

                  <Input
                    label="标签"
                    placeholder="用逗号分隔，如: 技术, 日记, 笔记"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    size="sm"
                    disabled={submitting}
                  />
                  <p className="text-xs text-zinc-400 -mt-2">
                    用逗号分隔多个标签，最多 20 个
                  </p>
                </>
              )}

              {errorMsg && <ErrorBanner message={errorMsg} />}
              {successMsg && <SuccessBanner message={successMsg} />}
            </div>

            <DialogFooter
              onClose={onClose}
              onSubmit={() => void handleSave()}
              submitting={submitting}
              loading={loading}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EditPageMetaDialog;
