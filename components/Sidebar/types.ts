import type { ElementType } from 'react';

export type SidebarVariant = 'user' | 'admin';

export interface MenuItem {
  key: string;
  icon: ElementType;
  href: string;
  group: string;
}

export interface SidebarUser {
  name?: string;
  avatar?: string;
  role?: string;
}
