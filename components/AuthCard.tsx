'use client';

import { type ReactNode, memo } from 'react';

export interface AuthCardProps {
  children?: ReactNode;
  footer?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
}

/**
 * 认证卡片 — 承载标题、副标题、表单内容和底部操作区
 */
export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* 标题区域 */}
      <div className="mb-14">
        {title && (
          <div className="mb-5">
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1.6,
                display: 'block',
                letterSpacing: '-0.5px',
              }}
            >
              {title}
            </span>
          </div>
        )}
        {subtitle && (
          <span
            style={{
              fontSize: 18,
              color: 'var(--ant-color-text-secondary)',
              lineHeight: 1.7,
              display: 'block',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* 内容区域 */}
      <div className="mb-8">{children}</div>

      {/* 底部操作区 */}
      {footer}
    </div>
  );
});

AuthCard.displayName = 'AuthCard';
export default AuthCard;
