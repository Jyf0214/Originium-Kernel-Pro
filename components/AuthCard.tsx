'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo } from 'react';

export interface AuthCardProps {
  children?: ReactNode;
  footer?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
}

/**
 * AuthCard Component
 * 
 * 参考LobeChat设计语言的认证卡片组件
 * 优化标题视觉权重、输入框样式和整体间距
 * 
 * @see https://github.com/lobehub/lobe-chat - UI设计参考
 * @copyright LobeChat UI Design
 */
export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <Flexbox width={'min(100%, 440px)'}>
      <Flexbox gap={16}>
        {title && (
          <Text fontSize={32} style={{ lineHeight: 1.2, letterSpacing: '-0.5px' }} weight={'bold'}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text fontSize={18} style={{ lineHeight: 1.4 }} type={'secondary'} weight={500}>
            {subtitle}
          </Text>
        )}
      </Flexbox>
      <Flexbox gap={8} paddingBlock={32}>
        {children}
      </Flexbox>
      {footer}
    </Flexbox>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
