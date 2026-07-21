'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Tags, User } from 'lucide-react';
import { cn } from '@/lib/ui';

interface TabItem {
  label: string;
  href: string;
  icon: typeof Home;
}

const TABS: TabItem[] = [
  { label: '首页', href: '/', icon: Home },
  { label: '文章', href: '/posts', icon: FileText },
  { label: '标签', href: '/tags', icon: Tags },
  { label: '关于', href: '/about', icon: User },
];

/**
 * 移动端底部 Tab 导航栏
 *
 * 仅在移动端（< 768px）显示，固定在视口底部。
 * 桌面端由 Navbar 提供导航，不需要此组件。
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 向下滚动时隐藏，向上滚动时显示
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY && currentY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg',
        'border-t border-zinc-200/50 dark:border-zinc-700/50',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      role="navigation"
      aria-label="移动端导航"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'transition-colors duration-200',
                isActive
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
