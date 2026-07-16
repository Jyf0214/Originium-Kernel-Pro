import { type TextareaHTMLAttributes, memo, forwardRef, useId } from 'react';
import { cn } from '@/lib/ui';
import { roundedStyles, ringStyles, FormControl, type FormRounded, type FormRing } from './form-styles';

export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaRounded = FormRounded;
export type TextareaRing = FormRing;

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** 最小高度(Tailwind 类,例如 'min-h-[120px]') */
  minH?: string;
  /** 圆角档位 */
  rounded?: TextareaRounded;
  /** 焦点环强度 */
  ring?: TextareaRing;
}

/**
 * 自定义多行文本框组件
 * - 默认 p-3 border border-zinc-200 text-sm
 * - minH 控制最小高度(Tailwind 类)
 * - rounded 改变圆角,ring 改变焦点环强度
 */
export const Textarea = memo(
  forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
      {
        className,
        label,
        error,
        id,
        minH = 'min-h-[100px]',
        rounded = 'md',
        ring = 'default',
        ...props
      },
      ref,
    ) => {
      const uniqueId = useId();
      const inputId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${uniqueId}` : undefined);

      const taEl = (
        <textarea
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full p-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm outline-none transition-colors resize-y',
            minH,
            roundedStyles[rounded],
            ringStyles[ring],
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
      );

      return (
        <FormControl inputId={inputId} label={label} error={error}>
          {taEl}
        </FormControl>
      );
    },
  ),
);

Textarea.displayName = 'Textarea';
export default Textarea;
