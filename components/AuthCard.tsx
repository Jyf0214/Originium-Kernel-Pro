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

export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <div style={{ marginBottom: 48 }}>
        {title && (
          <div style={{ marginBottom: 12 }}>
            <Text fontSize={32} weight={'bold'} style={{ lineHeight: '40px' }}>
              {title}
            </Text>
          </div>
        )}
        {subtitle && (
          <div>
            <Text fontSize={18} type={'secondary'} style={{ lineHeight: '28px' }}>
              {subtitle}
            </Text>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 24 }}>
        {children}
      </div>
      {footer}
    </div>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
