/**
 * 认证页面布局样式
 * 使用 antd CSS 变量保持与 antd 主题一致
 */
import type { CSSProperties } from 'react';

export const authStyles = {
  outer: {
    position: 'relative',
  } satisfies CSSProperties,
  innerDark: {
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid var(--ant-color-border-secondary)',
    borderRadius: 'var(--ant-border-radius)',
    background: 'var(--ant-color-bg-container)',
    boxShadow: '0 3px 1px -1px rgba(26,26,26,0.06)',
  } satisfies CSSProperties,
  innerLight: {
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid var(--ant-color-border)',
    borderRadius: 'var(--ant-border-radius)',
    background: 'var(--ant-color-bg-container)',
    boxShadow: '0 3px 1px -1px rgba(26,26,26,0.06)',
  } satisfies CSSProperties,
} as const;
