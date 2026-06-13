'use client';

/**
 * 新建页面弹窗组件
 *
 * 提供页面名称输入、模板选择、公开/私有切换，
 * 调用 POST /api/page/create 完成创建。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showError } from '@/lib/error';

/* ---------- 类型 ---------- */

interface CreatePageDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/* ---------- 模板数据 ---------- */

const TEMPLATES = [
  { type: 'blank', name: '空白页面', description: '从零开始，自由创建', icon: '📄' },
  { type: 'project', name: '项目展示', description: '展示项目特性和技术栈', icon: '🚀' },
  { type: 'docs', name: '笔记文档', description: '带目录和搜索的文档页', icon: '📝' },
];

/* ---------- 校验工具 ---------- */

/** 仅允许字母、数字、中文、连字符、下划线 */
const NAME_PATTERN = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '请输入页面名称';
  if (!NAME_PATTERN.test(trimmed)) return '仅支持字母、数字、中文、连字符、下划线';
  return null;
}

/* ---------- 公开/私有切换子组件 ---------- */

function VisibilityToggle({
  isPublic,
  onToggle,
  disabled,
}: {
  isPublic: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const label = isPublic ? '公开页面' : '私有页面';
  const desc = isPublic ? '所有人可以访问' : '仅自己可以访问';
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-zinc-50 rounded-xl">
      <div>
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isPublic ? 'bg-zinc-900' : 'bg-zinc-300',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 mt-0.5',
            isPublic ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/* ---------- 错误提示子组件 ---------- */

function ErrorBanner({
  message,
  onCopy,
}: {
  message: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 ring-1 ring-red-200">
      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700 break-all">{message}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 text-xs text-red-500 hover:text-red-700 underline"
      >
        复制
      </button>
    </div>
  );
}

/* ---------- 模板选择子组件 ---------- */

function TemplateSelector({
  selected,
  onSelect,
  disabled,
}: {
  selected: string;
  onSelect: (type: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TEMPLATES.map((tpl) => {
        const isSelected = selected === tpl.type;
        return (
          <button
            key={tpl.type}
            type="button"
            onClick={() => onSelect(tpl.type)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1.5 p-4 rounded-xl ring-1 transition-all duration-150 text-center',
              isSelected
                ? 'ring-zinc-900 bg-zinc-900 text-white shadow-md'
                : 'ring-zinc-200 bg-white text-zinc-700 hover:ring-zinc-400 hover:bg-zinc-50',
              disabled && 'opacity-60',
            )}
          >
            <span className="text-2xl leading-none">{tpl.icon}</span>
            <span className="text-sm font-medium">{tpl.name}</span>
            <span
              className={cn(
                'text-xs leading-tight',
                isSelected ? 'text-zinc-300' : 'text-zinc-400',
              )}
            >
              {tpl.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 组件 ---------- */

export function CreatePageDialog({ open, onClose, onCreated }: CreatePageDialogProps) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 防抖定时器引用
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 弹窗打开时重置状态
  useEffect(() => {
    if (open) {
      setName('');
      setSelectedTemplate('blank');
      setIsPublic(true);
      setSubmitting(false);
      setErrorMsg(null);
      setDuplicateError(null);
      // 自动聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // 名称输入变化时实时校验 + 防抖重名检查
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setDuplicateError(null);

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 格式校验即时生效
    if (value.trim() && !NAME_PATTERN.test(value.trim())) {
      return; // 格式不对，不进行重名检查
    }

    // 防抖 500ms 后进行重名检查
    if (value.trim()) {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/storage/folders');
          if (res.ok) {
            const data = await res.json();
            const folders: { name?: string; path?: string }[] = data.folders ?? [];
            const exists = folders.some((f) => f.name === value.trim());
            if (exists) {
              setDuplicateError('该名称已被使用，请更换');
            }
          }
        } catch (_err) {
          // 网络错误不阻塞用户输入，静默处理
        }
      }, 500);
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // 表单校验
  const nameError = name.trim() ? validateName(name) : null;
  const canSubmit = name.trim() && !nameError && !duplicateError && !submitting;

  // 提交创建
  const handleCreate = useCallback(async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/page/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          template: selectedTemplate,
          isPublic,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onCreated();
        onClose();
      } else {
        const msg = data.error ?? '创建失败，请重试';
        setErrorMsg(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络错误，请检查连接后重试';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, name, selectedTemplate, isPublic, onCreated, onClose]);

  // ESC 关闭
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    },
    [submitting, onClose],
  );

  // 一键复制错误信息
  const handleCopyError = useCallback(() => {
    if (errorMsg) {
      navigator.clipboard.writeText(errorMsg).catch((_err: unknown) => { /* 复制失败忽略 */ });
    }
  }, [errorMsg]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />

      {/* 弹窗主体 */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200 overflow-hidden"
      >
        {/* 头部：标题 + 关闭按钮 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-zinc-900">新建页面</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-40"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-4 space-y-6">
          {/* 名称输入 */}
          <div>
            <Input
              ref={inputRef}
              label="页面名称"
              placeholder="输入页面名称"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              error={nameError ?? duplicateError ?? undefined}
              size="md"
              rounded="md"
              disabled={submitting}
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              仅支持字母、数字、中文、连字符、下划线
            </p>
          </div>

          {/* 模板选择 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-700">
              选择模板
            </label>
            <TemplateSelector
              selected={selectedTemplate}
              onSelect={setSelectedTemplate}
              disabled={submitting}
            />
          </div>

          {/* 公开/私有开关 */}
          <VisibilityToggle
            isPublic={isPublic}
            onToggle={() => setIsPublic(!isPublic)}
            disabled={submitting}
          />

          {/* 错误提示 */}
          {errorMsg && (
            <ErrorBanner message={errorMsg} onCopy={handleCopyError} />
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 border-t border-zinc-100">
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            autoLoading={false}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            loading={submitting}
            disabled={!canSubmit}
            icon={submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreatePageDialog;
