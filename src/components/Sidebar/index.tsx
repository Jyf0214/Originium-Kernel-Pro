'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { Drawer } from '@/components/ui/Drawer';
import SidebarHeader from './SidebarHeader';
import SidebarUserMenu from './SidebarUserMenu';
import SidebarGroup from './SidebarGroup';
import SidebarCollapseButton from './SidebarCollapseButton';
import SudoModeButton from './SudoModeButton';
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
  const { user, isRoot, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { t } = useI18n();
  const { collapsed, toggle: toggleCollapsed, hydrated } = useSidebarCollapsed();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const items: MenuItem[] = menuItems.filter((item) => {
    // 角色过滤：仅当当前用户角色命中白名单时才显示
    if (item.roles && item.roles.length > 0) {
      const role = user?.role;
      if (!role) return false;
      // 白名单含 root 时，sudo 模式（admin 提权）同样命中
      if (item.roles.includes('root') && isRoot) return true;
      if (!item.roles.includes(role)) return false;
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
    const currentPath = pathname ?? '';

    // 带查询参数的菜单项（如回收站视图）：pathname + search 必须完整匹配
    if (href.includes('?')) {
      const currentSearch = search ? `?${search}` : '';
      return currentPath + currentSearch === href;
    }

    // /dashboard 仅自身页面高亮，不因子路由（/dashboard/xxx）点亮
    if (path === '/dashboard') return currentPath === '/dashboard';

    // 精确命中
    if (currentPath === path) {
      // 回收站视图（status=pending_deletion）由带查询参数的回收站菜单项独占高亮
      return !search.includes('status=pending_deletion');
    }

    // 子路径场景（如 /dashboard/config/preview 之于 /dashboard/config）：
    // 仅当没有更具体的菜单项命中当前路径时才高亮父项，防止两个菜单项同时高亮
    if (currentPath.startsWith(path)) {
      return !menuItems.some((other) => {
        if (other.href === href) return false;
        const otherPath = other.href.split('?')[0] ?? '';
        return otherPath.length > path.length && currentPath.startsWith(otherPath);
      });
    }

    return false;
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

        {/* sudo 模式入口（admin 提权）与桌面端折叠按钮 */}
        {!showCloseButton && (
          <>
            <SudoModeButton collapsed={desktopCollapsed} />
            <SidebarCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} />
          </>
        )}
        {showCloseButton && <SudoModeButton />}
      </nav>
    </div>
  );

  return (
    <>
      {/* 桌面端侧栏：折叠/展开宽度切换 + 阴影强度过渡（展开轻阴影、折叠深阴影悬浮感） */}
      <div
        className={`hidden md:flex max-h-screen overflow-y-auto z-[100] bg-white dark:bg-zinc-900 flex-col transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          hydrated && collapsed
            ? 'w-[68px] shadow-[12px_0_24px_-12px_rgba(0,0,0,0.2)] dark:shadow-[12px_0_24px_-12px_rgba(0,0,0,0.5)]'
            : 'w-[280px] shadow-[6px_0_12px_-10px_rgba(0,0,0,0.08)] dark:shadow-[6px_0_12px_-10px_rgba(0,0,0,0.25)]'
        }`}
      >
        {renderContent(false, hydrated && collapsed)}
      </div>
      {/* 移动端遮罩与抽屉：Portal 到 body。
          侧栏可能被渲染在 display:none 的父容器内（如三栏布局移动端隐藏左栏），
          若不脱离父容器，fixed 子元素会被一并隐藏导致抽屉无法打开 */}
      <Drawer
        open={isOpen}
        onClose={onClose}
        side="left"
        widthClass="w-[300px] max-w-[85vw]"
        overlayZ="z-[998]"
        panelZ="z-[999]"
        overlayClassName="md:hidden bg-zinc-900/40 backdrop-blur-md"
        panelClassName="md:hidden shadow-[16px_0_40px_-12px_rgba(0,0,0,0.22)] dark:shadow-[16px_0_40px_-12px_rgba(0,0,0,0.45)]"
      >
        <div id="primary-sidebar" className="flex flex-col h-full">
          {renderContent(true)}
        </div>
      </Drawer>
    </>
  );
}

export { Sidebar };
export default Sidebar;
