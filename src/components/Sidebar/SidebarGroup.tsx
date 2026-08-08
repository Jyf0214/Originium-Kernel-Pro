import React from 'react';
import { ChevronDown } from 'lucide-react';
import SidebarItem from './SidebarItem';
import { groupKeys } from './sidebar-config';
import type { MenuItem } from './types';
import type { I18nKey, TFunc } from '@/i18n/keys';

interface SidebarGroupProps {
  group: string;
  items: MenuItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onItemClick: () => void;
  t: TFunc;
  collapsed?: boolean;
}

const SidebarGroup = React.memo(function SidebarGroup({
  group,
  items,
  isCollapsed,
  onToggle,
  isActive,
  onItemClick,
  t,
  collapsed,
}: SidebarGroupProps) {
  const isAdminGroup = group === 'admin';
  // groupKeys 覆盖全部菜单分组；未覆盖时回退显示分组原文
  const getGroupLabel = (g: string) => t((groupKeys[g] ?? g) as I18nKey);

  return (
    <div className="space-y-1.5">
      {/* 折叠模式下隐藏分组标题 */}
      {!collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full px-3 mb-1 group/title"
        >
          <span
            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              isAdminGroup ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600'
            }`}
          >
            {getGroupLabel(group)}
          </span>
          <ChevronDown
            size={12}
            className={`text-zinc-200 dark:text-zinc-700 transition-transform duration-300 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
          />
        </button>
      )}

      {(!isCollapsed || collapsed) && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              isAdminGroup={isAdminGroup}
              onItemClick={onItemClick}
              t={t}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default SidebarGroup;
