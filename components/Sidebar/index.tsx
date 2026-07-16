'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import SidebarHeader from './SidebarHeader';
import SidebarUserMenu from './SidebarUserMenu';
import SidebarGroup from './SidebarGroup';
import SidebarCollapseButton from './SidebarCollapseButton';
import { useSidebarCollapsed } from './use-sidebar-collapsed';
import { menuItems } from './sidebar-config';
import { showCuteLogoutConfirm } from '@/components/ui/CuteLogout';
import type { MenuItem } from './types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** 数据库是否已配置，默认 true（向后兼容） */
  databaseConfigured?: boolean;
}

function Sidebar({ isOpen, onClose, databaseConfigured = true }: SidebarProps) {
  const { user, isSudo, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { t } = useI18n();
  const { collapsed, toggle: toggleCollapsed, hydrated } = useSidebarCollapsed();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const items: MenuItem[] = menuItems.filter((item) => {
    // 角色过滤
    if (item.roles && item.roles.length > 0) {
      if (item.roles.includes('sudo')) {
        if (!isSudo) return false;
      } else {
        return false;
      }
    }
    // 数据库依赖过滤：requiresDb=true 时仅数据库已配置才显示
    if (item.requiresDb && !databaseConfigured) return false;
    return true;
  });

  const handleLogout = async () => {
    const confirmed = await showCuteLogoutConfirm();
    if (confirmed) {
      await logout();
      window.location.href = '/login';
    }
  };

  const isActive = useCallback((href: string) => {
    const [path = ''] = href.split('?');
    if (path === '/dashboard') return pathname === '/dashboard';
    const currentPath = pathname ?? '';
    if (!currentPath.startsWith(path)) return false;
    // href 带查询参数时，必须完整匹配（防止 /dashboard/articles 同时高亮两个）
    if (href.includes('?')) {
      const currentSearch = search ? `?${search}` : '';
      return currentPath + currentSearch === href;
    }
    return true;
  }, [pathname, search]);

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const g = item.group ?? 'other';
    acc[g] ??= [];
    acc[g].push(item);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const renderContent = (showCloseButton: boolean, desktopCollapsed = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800">
      <SidebarHeader showCloseButton={showCloseButton} onClose={onClose} collapsed={desktopCollapsed} />
      <SidebarUserMenu user={user ?? undefined} onLogout={handleLogout} collapsed={desktopCollapsed} />
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-7 custom-scrollbar">
        {Object.entries(grouped).map(([group, groupItems]) => (
          <SidebarGroup
            key={group}
            group={group}
            items={groupItems}
            isCollapsed={!!collapsedGroups[group]}
            onToggle={() => toggleGroup(group)}
            isActive={isActive}
            onItemClick={onClose}
            t={t}
            collapsed={desktopCollapsed}
          />
        ))}

        {/* 桌面端折叠按钮 */}
        {!showCloseButton && (
          <SidebarCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} />
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* 桌面端侧栏：折叠/展开宽度切换 + 宽度过渡动画 */}
      <div
        className={`hidden md:flex max-h-screen overflow-y-auto z-[100] bg-white dark:bg-zinc-900 flex-col transition-[width] duration-200 ease-in-out ${
          hydrated && collapsed ? 'w-[68px]' : 'w-[280px]'
        }`}
      >
        {renderContent(false, hydrated && collapsed)}
      </div>
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-zinc-900/40 backdrop-blur-md z-[998] transition-opacity duration-300"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <div
        id="primary-sidebar"
        className="md:hidden fixed top-0 h-screen w-[300px] overflow-y-auto z-[999] bg-white dark:bg-zinc-900 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
        style={{ left: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {renderContent(true)}
      </div>
    </>
  );
}

export { Sidebar };
export default Sidebar;
