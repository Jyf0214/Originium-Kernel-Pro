'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { UserMenu } from '@/components/UserMenu';
import { Hitokoto } from '@/components/Hitokoto';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Clock, MapPin, Search, Sun, Moon, Monitor, Keyboard, Menu, X, Home, FileText, Info, Hash, Archive, Lock } from 'lucide-react';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import type { NavConfig } from '@/lib/config-schema';
import type { TFunc } from '@/i18n/keys';

const SearchDialog = dynamic(
  () => import('@/components/SearchDialog').then((m) => ({ default: m.SearchDialog })),
  { ssr: false },
);

const KeyboardShortcutsHelp = dynamic(
  () => import('@/components/ui/KeyboardShortcutsHelp').then((m) => ({ default: m.KeyboardShortcutsHelp })),
  { ssr: false },
);

interface NavbarProps {
  navConfig?: NavConfig;
  siteTitle?: string;
  /** 数据库是否已配置，false 时隐藏登录入口 */
  databaseConfigured?: boolean;
}

const ADMIN_PREFIXES = ['/dashboard', '/admin', '/editor'];

/* ── 菜单项链接 ── */

function DrawerLink({
  href,
  pathname,
  icon,
  label,
  onClick,
}: {
  href: string;
  pathname: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/* ── 抽屉底部工具栏 ── */

function DrawerToolbar({
  databaseConfigured,
  t,
  onClose,
}: {
  databaseConfigured: boolean;
  t: TFunc;
  onClose: () => void;
}) {
  const { user } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      {user ? (
        <UserMenu />
      ) : databaseConfigured ? (
        <Link href="/login" onClick={onClose}>
          <Button variant="default" size="sm" autoLoading={false}>
            {t('auth.login')}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

/* ── 抽屉内容 ── */

function DrawerContent({
  pathname,
  navConfig,
  time,
  databaseConfigured,
  t,
  closeDrawer,
}: {
  pathname: string;
  navConfig: NavConfig | null;
  time: string;
  databaseConfigured: boolean;
  t: TFunc;
  closeDrawer: () => void;
}) {
  const { user } = useAuth();
  const menuItems = navConfig?.enable && navConfig.menu
    ? navConfig.menu.flatMap((group) => group.item)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-3" onClick={closeDrawer}>
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
            <Image
              src="/favicon.svg"
              alt={t('components.Navbar.faviconAlt')}
              width={36}
              height={36}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('sidebar.originiumKernel')}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="md"
          iconOnly
          autoLoading={false}
          onClick={closeDrawer}
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label={t('components.Navbar.closeMenu')}
          icon={<X size={18} />}
        />
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <DrawerLink href="/" pathname={pathname} icon={<Home size={18} />} label={t('sidebar.home')} onClick={closeDrawer} />
        {menuItems.map((item, i) => (
          <DrawerLink
            key={i}
            href={item.link}
            pathname={pathname}
            icon={item.icon ? <Image src={item.icon} alt="" width={16} height={16} unoptimized className="w-4 h-4" /> : <FileText size={18} />}
            label={item.name}
            onClick={closeDrawer}
          />
        ))}
        <DrawerLink href="/posts" pathname={pathname} icon={<FileText size={18} />} label={t('sidebar.posts')} onClick={closeDrawer} />
        <DrawerLink href="/archives" pathname={pathname} icon={<Archive size={18} />} label={t('components.Navbar.archives')} onClick={closeDrawer} />
        <DrawerLink href="/tags" pathname={pathname} icon={<Hash size={18} />} label={t('components.Navbar.tags')} onClick={closeDrawer} />
        <DrawerLink href="/travel" pathname={pathname} icon={<MapPin size={18} />} label={t('components.Navbar.travel')} onClick={closeDrawer} />
        <DrawerLink href="/about" pathname={pathname} icon={<Info size={18} />} label={t('components.Navbar.about')} onClick={closeDrawer} />
        {user && (
          <DrawerLink href="/posts/private" pathname={pathname} icon={<Lock size={18} />} label={t('components.Navbar.privatePosts')} onClick={closeDrawer} />
        )}
      </nav>

      {/* 底部 */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-4">
        {(navConfig?.travelling || (navConfig?.clock && time)) && (
          <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            {navConfig?.travelling && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                <MapPin size={12} />
                {t('components.Navbar.travelling')}
              </span>
            )}
            {navConfig?.clock && time && (
              <span className="flex items-center gap-1 font-mono">
                <Clock size={12} />
                {time}
              </span>
            )}
          </div>
        )}
        <Hitokoto />
        <DrawerToolbar
          databaseConfigured={databaseConfigured}
          t={t}
          onClose={closeDrawer}
        />
      </div>
    </div>
  );
}

/* ── 抽屉状态 Hook ── */

function useNavbarState(navConfigProp?: NavConfig) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [time, setTime] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // 静态导出模式：navConfig 始终通过 props 传入
  const navConfig = navConfigProp ?? null;

  useEffect(() => {
    if (!navConfig?.clock) return;
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [navConfig?.clock]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useKeyboardShortcuts({
    '/': () => setSearchOpen(true),
    'Shift+?': () => setShortcutsOpen(true),
    Escape: () => {
      if (shortcutsOpen) setShortcutsOpen(false);
      else if (drawerOpen) setDrawerOpen(false);
      else if (searchOpen) setSearchOpen(false);
    },
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    drawerOpen,
    setDrawerOpen,
    navConfig,
    time,
    searchOpen,
    setSearchOpen,
    shortcutsOpen,
    setShortcutsOpen,
    closeDrawer,
  };
}

/* ── 主组件 ── */

export function Navbar({ navConfig: navConfigProp, databaseConfigured = true }: NavbarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { mode, cycle } = useThemeMode();
  const state = useNavbarState(navConfigProp);

  const isAdminPage = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAdminPage) return null;

  return (
    <>
      {/* 汉堡按钮 — 最右 */}
      <Button
        variant="ghost"
        size="md"
        iconOnly
        autoLoading={false}
        onClick={() => state.setDrawerOpen(true)}
        className="fixed top-3 right-3 z-[60] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label={t('components.Navbar.openMenu')}
        icon={<Menu size={22} />}
      />

      {/* 快捷键按钮 — 汉堡左侧，仅 PC 端 */}
      <Button
        variant="ghost"
        size="md"
        iconOnly
        autoLoading={false}
        onClick={() => state.setShortcutsOpen(true)}
        className="fixed top-3 right-[48px] z-[60] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hidden md:inline-flex"
        aria-label={t('components.Navbar.shortcutsHelp')}
        title={t('components.Navbar.shortcutsTitle')}
        icon={<Keyboard size={22} />}
      />

      {/* 深色模式切换 — 快捷键左侧 */}
      <Button
        variant="ghost"
        size="md"
        iconOnly
        autoLoading={false}
        onClick={cycle}
        className="fixed top-3 right-[48px] md:right-[84px] z-[60] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label={mode === 'light' ? t('components.Navbar.lightMode') : mode === 'dark' ? t('components.Navbar.darkMode') : t('components.Navbar.followSystem')}
        title={mode === 'light' ? t('components.Navbar.lightMode') : mode === 'dark' ? t('components.Navbar.darkMode') : t('components.Navbar.followSystem')}
        icon={mode === 'light' ? <Sun size={22} /> : mode === 'dark' ? <Moon size={22} /> : <Monitor size={22} />}
      />

      {/* 搜索按钮 — 最左侧 */}
      <Button
        variant="ghost"
        size="md"
        iconOnly
        autoLoading={false}
        onClick={() => state.setSearchOpen(true)}
        className="fixed top-3 right-[84px] md:right-[120px] z-[60] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label={t('components.Navbar.search')}
        title={typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? t('components.Navbar.searchMac') : t('components.Navbar.searchShortcut')}
        icon={<Search size={22} />}
      />

      {/* 遮罩 */}
      {state.drawerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          onClick={state.closeDrawer}
        />
      )}

      {/* 抽屉 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] z-[80] bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-700 transform transition-transform duration-300 ease-in-out ${
          state.drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DrawerContent
          pathname={pathname}
          navConfig={state.navConfig}
          time={state.time}
          databaseConfigured={databaseConfigured}
          t={t}
          closeDrawer={state.closeDrawer}
        />
      </div>

      <SearchDialog open={state.searchOpen} onClose={() => state.setSearchOpen(false)} />
      <KeyboardShortcutsHelp open={state.shortcutsOpen} onClose={() => state.setShortcutsOpen(false)} />
    </>
  );
}
