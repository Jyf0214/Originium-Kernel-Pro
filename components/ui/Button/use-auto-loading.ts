'use client';

import { useState, useCallback } from 'react';

/**
 * 按钮自动加载状态管理 Hook
 *
 * - autoLoading 默认开启：点击后自动进入加载，按钮变淡且不可重复点击
 * - 若 onClick 返回 Promise，加载状态在 Promise 完成后自动解除
 * - loading prop 传入时进入受控模式，autoLoading 不生效
 */
export function useAutoLoading(
  loading: boolean | undefined,
  autoLoading: boolean,
  disabled: boolean | undefined,
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined,
) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isControlled = loading !== undefined;
  const isLoading = isControlled ? loading : internalLoading;

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || disabled) return;
    if (!autoLoading || isControlled) {
      onClick?.(e);
      return;
    }
    setInternalLoading(true);
    void Promise.resolve(onClick?.(e)).finally(() => setInternalLoading(false));
  }, [isLoading, disabled, autoLoading, isControlled, onClick]);

  return { isLoading, handleClick, showLoading: loading || (autoLoading && internalLoading) };
}
