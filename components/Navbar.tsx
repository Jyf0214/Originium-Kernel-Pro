'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserMenu } from '@/components/UserMenu';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import { LoginOutlined } from '@ant-design/icons';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Clock, MapPin, Search, Sun, Moon, Monitor, Keyboard } from 'lucide-react';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { usePathname } from 'next/navigation';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import type { NavConfig } from '@/lib/config-schema';

// 搜索弹窗动态导入，避免首屏加载无关代码
const SearchDialog = dynamic(
  () => import('@/components/SearchDialog').then((m) => ({ default: m.SearchDialog })),
  { ssr: false },
);

// 快捷键帮助弹窗动态导入
const KeyboardShortcutsHelp = dynamic(
  () => import('@/components/ui/KeyboardShortcutsHelp').then((m) => ({ default: m.KeyboardShortcutsHelp })),
  { ssr: false },
);

// 服务端传入的导航配置 props
interface NavbarProps {
  navConfig?: NavConfig;
  siteTitle?: string;
}

function NavMenuGroupComponent({ config, isNavSolid }: { config: NavConfig | null; isNavSolid: boolean }) {
  if (!config?.enable || !config.menu?.length) return null;
  return (
    <div className="hidden md:flex items-center gap-1 ml-8">
      {config.menu.map((group, gi) => (
        <React.Fragment key={gi}>
          {group.item.map((item, ii) => (
            <Link key={`${gi}-${ii}`} href={item.link}>
              <Button variant="ghost" size="sm" autoLoading={false} className={isNavSolid ? 'text-zinc-500 dark:text-zinc-400' : 'text-white/70 hover:text-white'}>
                {item.icon && <img src={item.icon} alt="" className="w-4 h-4" />}
                {item.name}
              </Button>
            </Link>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function NavClock({ travelling, clock, time, isNavSolid }: { travelling?: boolean; clock?: boolean; time: string; isNavSolid: boolean }) {
  return (
    <>
      {travelling && (
        <span className={`hidden md:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${isNavSolid ? 'text-amber-600 bg-amber-50' : 'text-amber-200 bg-white/10'}`}>
          <MapPin size={12} />
          旅行中
        </span>
      )}
      {clock && time && (
        <span className={`hidden md:flex items-center gap-1 text-xs font-mono ${isNavSolid ? 'text-zinc-400' : 'text-white/50'}`}>
          <Clock size={12} />
          {time}
        </span>
      )}
    </>
  );
}

function NavAuthSection({ user, allowRegistration, clerkAvailable, t, isNavSolid }: { user: unknown; allowRegistration: boolean; clerkAvailable: boolean; t: (key: string) => string; isNavSolid: boolean }) {
  if (user) return <UserMenu />;
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Link href="/login">
        <Button variant="default" size="sm" autoLoading={false} className={isNavSolid ? 'text-zinc-600' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}>
          {t('auth.login')}
        </Button>
      </Link>
      {allowRegistration && (
        <Link href="/login" className="hidden sm:inline-flex">
          <Button variant="primary" size="sm" autoLoading={false}>
            <LoginOutlined />
            <span>{t('auth.register')}</span>
          </Button>
        </Link>
      )}
      {clerkAvailable && allowRegistration && (
        <ClerkAuthProvider>
          <ClerkLoginSection variant="compact" />
        </ClerkAuthProvider>
      )}
    </div>
  );
}

// eslint-disable-next-line complexity
export function Navbar({ navConfig: navConfigProp, siteTitle: _siteTitle }: NavbarProps) {
  const { user, clerkAvailable } = useAuth();
  const { t } = useI18n();
  const { config: siteConfig } = useConfig();
  const { mode, cycle } = useThemeMode();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const scrollY = useScrollPosition();

  // 帖子详情页沉浸式导航：仅在 /posts/[...] 路径下激活
  const isPostDetail = pathname.startsWith('/posts/') && pathname !== '/posts';
  // 封面高度阈值（约 400px），超过后切换为实体导航栏
  const isNavSolid = !isPostDetail || scrollY >= 400;

  // 优先使用服务端传入的配置，无则初始化为 null（降级 fetch 填充）
  const [navConfig, setNavConfig] = useState<NavConfig | null>(navConfigProp ?? null);
  const [time, setTime] = useState('');
  const allowRegistration = siteConfig?.auth?.allowRegistration !== false;
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // 全局快捷键注册
  useKeyboardShortcuts({
    '/': () => setSearchOpen(true),
    'Shift+?': () => setShortcutsOpen(true),
    Escape: () => {
      if (shortcutsOpen) setShortcutsOpen(false);
      else if (searchOpen) setSearchOpen(false);
    },
  });

  // Ctrl+K / Cmd+K 打开搜索
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

  // 仅在服务端未传入配置时，降级为客户端 fetch 获取导航配置
  useEffect(() => {
    if (navConfigProp) return; // 已有服务端数据，跳过请求
    const controller = new AbortController();
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.nav) {
            setNavConfig(data.nav);
          }
        } else {
          console.warn('导航配置获取失败:', res.status);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('导航配置请求异常，使用默认导航');
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

  return (
    <>
    <nav
      aria-label="主导航"
      className={`sticky top-0 z-50 transition-all duration-500 ${
        isNavSolid
          ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-700/60'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center min-w-0">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                isNavSolid
                  ? 'bg-gradient-to-br from-zinc-900 to-zinc-700'
                  : 'bg-white/20 backdrop-blur-sm'
              }`}>
                <span className="font-bold text-lg leading-none text-white">O</span>
              </div>
              <span className={`font-display font-bold text-xl tracking-tight hidden sm:inline ${
                isNavSolid ? 'text-zinc-900 dark:text-zinc-100' : 'text-white'
              }`}>{t('sidebar.originiumKernel')}</span>
            </Link>
            <NavMenuGroupComponent config={navConfig} isNavSolid={isNavSolid} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* 深色模式切换按钮 */}
            <Button
              onClick={cycle}
              variant="ghost"
              size="sm"
              autoLoading={false}
              iconOnly
              icon={mode === 'light' ? <Sun size={18} /> : mode === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
              aria-label={mode === 'light' ? '浅色模式' : mode === 'dark' ? '深色模式' : '跟随系统'}
              title={mode === 'light' ? '浅色模式' : mode === 'dark' ? '深色模式' : '跟随系统'}
              className={isNavSolid ? '' : 'text-white/70 hover:text-white'}
            />
            {/* 语言切换器 */}
            <div className={isNavSolid ? '' : '[&_*]:text-white/70 [&_*]:hover:text-white'}>
              <LanguageSwitcher />
            </div>
            {/* 搜索按钮 */}
            <Button
              onClick={() => setSearchOpen(true)}
              variant="ghost"
              size="sm"
              autoLoading={false}
              iconOnly
              icon={<Search size={18} />}
              aria-label="搜索"
              title="搜索 (/)"
              className={isNavSolid ? '' : 'text-white/70 hover:text-white'}
            />
            {/* 快捷键帮助按钮——手机端隐藏，节省空间 */}
            <Button
              onClick={() => setShortcutsOpen(true)}
              variant="ghost"
              size="sm"
              autoLoading={false}
              iconOnly
              icon={<Keyboard size={18} />}
              aria-label="快捷键帮助"
              title="快捷键 (?)"
              className={`hidden sm:inline-flex ${isNavSolid ? '' : 'text-white/70 hover:text-white'}`}
            />
            {!isHome && <NavClock travelling={navConfig?.travelling} clock={navConfig?.clock} time={time} isNavSolid={isNavSolid} />}
            <NavAuthSection user={user} allowRegistration={allowRegistration} clerkAvailable={clerkAvailable} t={t} isNavSolid={isNavSolid} />
          </div>
        </div>
      </div>
    </nav>
    <SearchDialog
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
    />
    <KeyboardShortcutsHelp
      open={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
    />
    </>
  );
}
