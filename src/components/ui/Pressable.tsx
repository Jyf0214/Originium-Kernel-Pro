'use client';

import { type ReactNode, type ElementType, type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/ui';

/**
 * Pressable — 统一交互反馈组件
 *
 * 提供一致的 hover 悬浮 + active 按压效果，适用于所有可交互元素。
 * 支持 as 声明渲染元素类型（button、a、div 等）。
 *
 * @example
 * <Pressable as="a" href="/about">关于</Pressable>
 * <Pressable as="button" onClick={handleClick}>提交</Pressable>
 * <Pressable variant="lift">卡片</Pressable>
 */

type PressableVariant = 'lift' | 'press' | 'scale';

interface PressableProps<T extends ElementType = 'button'> {
  as?: T;
  variant?: PressableVariant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

const variantStyles: Record<PressableVariant, string> = {
  lift: 'ui-interactive',
  press: 'ui-press',
  scale: 'ui-press',
};

const Pressable = forwardRef<HTMLButtonElement, PressableProps & ComponentPropsWithoutRef<'button'>>(
  ({ as: Component = 'button', variant = 'lift', children, className, disabled, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(variantStyles[variant], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Pressable.displayName = 'Pressable';

export { Pressable, type PressableProps, type PressableVariant };
