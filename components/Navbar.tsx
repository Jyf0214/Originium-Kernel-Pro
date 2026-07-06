'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { UserMenu } from '@/components/UserMenu';
import { Hitokoto } from '@/components/Hitokoto';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Clock, MapPin, Search, Sun, Moon, Monitor, Keyboard, Menu, X, Home, FileText, Info, Hash } from 'lucide-react';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import type { NavConfig } from '@/lib/config-schema';

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
  clerkAvailable,
  t,
  onClose,
}: {
  clerkAvailable: boolean;
  t: (key: string) => string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      {user ? (
        <UserMenu />
      ) : (
        <Link href="/login" onClick={onClose}>
          <Button variant="default" size="sm" autoLoading={false}>
            {t('auth.login')}
          </Button>
        </Link>
      )}
      {clerkAvailable && !user && (
        <ClerkAuthProvider>
          <ClerkLoginSection variant="compact" />
        </ClerkAuthProvider>
      )}
    </div>
  );
}

/* ── 抽屉内容 ── */

function DrawerContent({
  pathname,
  navConfig,
  time,
  clerkAvailable,
  t,
  closeDrawer,
}: {
  pathname: string;
  navConfig: NavConfig | null;
  time: string;
  clerkAvailable: boolean;
  t: (key: string) => string;
  closeDrawer: () => void;
}) {
  const menuItems = navConfig?.enable && navConfig.menu
    ? navConfig.menu.flatMap((group) => group.item)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-3" onClick={closeDrawer}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center shadow-sm">
            <span className="font-bold text-lg leading-none text-white">O</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('sidebar.originiumKernel')}
          </span>
        </Link>
        <button
          type="button"
          onClick={closeDrawer}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="关闭菜单"
        >
          <X size={18} />
        </button>
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <DrawerLink href="/" pathname={pathname} icon={<Home size={18} />} label="首页" onClick={closeDrawer} />
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
        <DrawerLink href="/posts" pathname={pathname} icon={<FileText size={18} />} label="帖子" onClick={closeDrawer} />
        <DrawerLink href="/tags" pathname={pathname} icon={<Hash size={18} />} label="标签" onClick={closeDrawer} />
        <DrawerLink href="/about" pathname={pathname} icon={<Info size={18} />} label="关于" onClick={closeDrawer} />
      </nav>

      {/* 底部 */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-4">
        {(navConfig?.travelling || (navConfig?.clock && time)) && (
          <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            {navConfig?.travelling && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                <MapPin size={12} />
                旅行中
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
          clerkAvailable={clerkAvailable}
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
  const [navConfig, setNavConfig] = useState<NavConfig | null>(navConfigProp ?? null);
  const [time, setTime] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (navConfigProp) return;
    const controller = new AbortController();
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.nav) setNavConfig(data.nav);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    };
    void fetchNav();
    return () => controller.abort();
  }, [navConfigProp]);

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

export function Navbar({ navConfig: navConfigProp }: NavbarProps) {
  const { t } = useI18n();
  const { clerkAvailable } = useAuth();
  const pathname = usePathname();
  const { mode, cycle } = useThemeMode();
  const state = useNavbarState(navConfigProp);

  const isAdminPage = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAdminPage) return null;

  return (
    <>
      {/* 汉堡按钮 — 最右 */}
      <button
        type="button"
        onClick={() => state.setDrawerOpen(true)}
        className="fixed top-3 right-3 z-[60] p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        aria-label="打开菜单"
      >
        <Menu size={22} />
      </button>

      {/* 快捷键按钮 — 汉堡左侧，仅 PC 端 */}
      <button
        type="button"
        onClick={() => state.setShortcutsOpen(true)}
        className="fixed top-3 right-[48px] z-[60] p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors hidden md:block"
        aria-label="快捷键帮助"
        title="快捷键 (?)"
      >
        <Keyboard size={22} />
      </button>

      {/* 深色模式切换 — 快捷键左侧 */}
      <button
        type="button"
        onClick={cycle}
        className="fixed top-3 right-[48px] md:right-[84px] z-[60] p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        aria-label={mode === 'light' ? '浅色模式' : mode === 'dark' ? '深色模式' : '跟随系统'}
        title={mode === 'light' ? '浅色模式' : mode === 'dark' ? '深色模式' : '跟随系统'}
      >
        {mode === 'light' ? <Sun size={22} /> : mode === 'dark' ? <Moon size={22} /> : <Monitor size={22} />}
      </button>

      {/* 搜索按钮 — 最左侧 */}
      <button
        type="button"
        onClick={() => state.setSearchOpen(true)}
        className="fixed top-3 right-[84px] md:right-[120px] z-[60] p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        aria-label="搜索"
        title={typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '搜索 (⌘K)' : '搜索 (Ctrl+K)'}
      >
        <Search size={22} />
      </button>

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
          clerkAvailable={clerkAvailable}
          t={t}
          closeDrawer={state.closeDrawer}
        />
      </div>

      <SearchDialog open={state.searchOpen} onClose={() => state.setSearchOpen(false)} />
      <KeyboardShortcutsHelp open={state.shortcutsOpen} onClose={() => state.setShortcutsOpen(false)} />
    </>
  );
}
