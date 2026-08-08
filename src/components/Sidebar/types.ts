import type { ElementType } from 'react';
import type { I18nKey } from '@/i18n/keys';

export interface MenuItem {
  /** i18n 翻译键（菜单文案统一走字典，不允许任意字符串） */
  key: I18nKey;
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
