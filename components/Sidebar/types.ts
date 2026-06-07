import type { ElementType } from 'react';

export type SidebarVariant = 'user' | 'admin';

export interface MenuItem {
  key: string;
  icon: ElementType;
  href: string;
  group: string;
  /**
   * 可选的角色白名单。
   * - 未设置或为空数组：所有用户可见
   * - 设置后：仅当当前用户角色命中列表时才渲染
   */
  roles?: string[];
}

export interface SidebarUser {
  name?: string;
  avatar?: string;
  role?: string;
}
