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
    <Flexbox width={'min(100%, 440px)'}>
      <Flexbox gap={16}>
        {title && (
          <Text fontSize={28} style={{ lineHeight: 1.4 }} weight={'bold'}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text fontSize={18} style={{ lineHeight: 1.4 }} type={'secondary'} weight={500}>
            {subtitle}
          </Text>
        )}
      </Flexbox>
      <Flexbox gap={4} paddingBlock={32}>
        {children}
      </Flexbox>
      {footer}
    </Flexbox>
  );
});

export default AuthCard;
