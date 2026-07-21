'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Columns } from 'lucide-react';
import { LazyMarkdownRenderer } from '@/components/MarkdownRenderer/dynamic';

/** 编辑器视图模式 */
type EditorMode = 'edit' | 'preview' | 'split';

/** 模式切换按钮配置 */
const MODE_OPTIONS: { key: EditorMode; icon: typeof Pencil; label: string }[] = [
  { key: 'edit', icon: Pencil, label: '编辑' },
  { key: 'split', icon: Columns, label: '分屏' },
  { key: 'preview', icon: Eye, label: '预览' },
];

interface MarkdownEditorPanelProps {
  content: string;
  onContentChange: (value: string) => void;
  placeholder: string;
}

/**
 * Markdown 编辑器面板 — 支持编辑/预览/分屏三种模式
 * 桌面端分屏时左右布局，移动端上下布局
 */
export function MarkdownEditorPanel({
  content,
  onContentChange,
  placeholder,
}: MarkdownEditorPanelProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('split');

  return (
    <div className="flex-1 flex flex-col min-h-[300px] max-h-[70vh]">
      {/* 模式切换按钮栏 */}
      <div className="flex items-center gap-1 p-1 mb-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start">
        {MODE_OPTIONS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setEditorMode(key)}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              editorMode === key
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* 编辑和预览内容区 */}
      <div
        className={`flex-1 flex ${
          editorMode === 'split' ? 'flex-col md:flex-row' : 'flex-col'
        } gap-4 min-h-0`}
      >
        {/* Markdown 编辑区 */}
        {(editorMode === 'edit' || editorMode === 'split') && (
          <textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className={`${
              editorMode === 'split' ? 'flex-1 min-h-[200px] md:min-h-0' : 'flex-1'
            } w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-zinc-800 dark:text-zinc-200 font-mono text-sm resize-none outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors overflow-auto`}
          />
        )}

        {/* 实时预览区 */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div
            className={`${
              editorMode === 'split' ? 'flex-1 min-h-[200px] md:min-h-0' : 'flex-1'
            } bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 overflow-auto`}
          >
            {content.trim() ? (
              <LazyMarkdownRenderer content={content} />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-300 dark:text-zinc-600 text-sm">
                在左侧输入 Markdown 内容后，这里会实时显示渲染结果
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
