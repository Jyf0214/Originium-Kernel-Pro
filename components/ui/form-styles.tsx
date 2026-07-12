/**
 * 表单组件共享样式映射
 * 从 Input / Textarea / Select 三组件中提取的重复样式定义，
 * 包含尺寸、圆角、焦点环映射以及 label + error 布局包装组件。
 */
import { type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// 共享类型
// ---------------------------------------------------------------------------

/** 输入框/选择器尺寸档位（sm=h-9 / md=h-10 / lg=h-11 / xl=h-12） */
export type FormSize = 'sm' | 'md' | 'lg' | 'xl';

/** 圆角档位（sm=rounded-lg / md=rounded-xl / lg=rounded-2xl / full=rounded-full / none=rounded-none） */
export type FormRounded = 'sm' | 'md' | 'lg' | 'full' | 'none';

/** 焦点环强度（default=ring-1 zinc-400 / strong=ring-2 zinc-900） */
export type FormRing = 'default' | 'strong';

// ---------------------------------------------------------------------------
// 样式映射
// ---------------------------------------------------------------------------

/** 输入框/选择器高度 + 内边距 + 字号映射 */
export const sizeStyles: Record<FormSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-11 px-4 text-sm',
  xl: 'h-12 px-4 text-base',
};

/** 圆角映射 */
export const roundedStyles: Record<FormRounded, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
  none: 'rounded-none',
};

/** 焦点环映射 */
export const ringStyles: Record<FormRing, string> = {
  default: 'focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400',
  strong: 'focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900',
};

// ---------------------------------------------------------------------------
// label + error 布局包装
// ---------------------------------------------------------------------------

export interface FormControlProps {
  /** 关联的表单元素 ID */
  inputId: string | undefined;
  /** 标签文本 */
  label?: string;
  /** 错误提示文本 */
  error?: string;
  /** 被包裹的表单元素 */
  children: ReactNode;
}

/**
 * 表单控件布局包装 — 统一 label / error 的排版结构
 * - 无 label 且无 error 时直接渲染 children，不额外包裹 div
 */
export function FormControl({ inputId, label, error, children }: FormControlProps) {
  if (!label && !error) return <>{children}</>;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-2 text-zinc-700">
          {label}
        </label>
      )}
      {children}
      {error && <p id={`${inputId}-error`} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
