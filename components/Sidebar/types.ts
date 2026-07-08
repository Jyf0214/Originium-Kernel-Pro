import type { ElementType } from 'react';

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
  /**
   * 标记为需要存储后端配置的实验性功能。
   * - 未设置或 false：始终显示
   * - true：仅当 storageConfigured=true 时显示
   */
  requiresStorage?: boolean;
  /**
   * 标记为需要数据库的功能。
   * - 未设置或 false：始终显示
   * - true：仅当 databaseConfigured=true 时显示
   */
  requiresDb?: boolean;
}

export interface SidebarUser {
  name?: string;
  avatar?: string;
  role?: string;
}
