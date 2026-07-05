'use client';

/**
 * 自定义 HTML 页面浮动用户 widget
 *
 * 设计:
 * - 固定在右上角,不阻挡 iframe 内容交互
 * - 已登录:展示头像 + 显示名,跳转到个人主页
 * - 未登录:展示「游客」+ 登录图标,跳转到 /login
 * - 加载中:展示骨架占位
 *
 * 所有用户可见字符串走 i18n(`page.*` 命名空间)。
 */
import Link from 'next/link';
import { LogIn, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { useI18n } from '@/hooks/use-i18n';
import { Avatar } from '@/components/Avatar';

function WidgetSkeleton() {
  return (
    <div
      className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-md ring-1 ring-zinc-200 backdrop-blur"
      aria-hidden
    >
      <div className="h-9 w-9 animate-pulse rounded-xl bg-zinc-200" />
      <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
    </div>
  );
}

export function UserWidget() {
  const { user, loading } = useAuth();
  const { config } = useConfig();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-[9999]">
        <WidgetSkeleton />
      </div>
    );
  }

  if (user) {
    const displayName = user.displayName || user.name || user.email;
    const profileHref = `/${user.name ?? user.uid}`;
    return (
      <div className="fixed top-4 right-4 z-[9999]">
        <Link
          href={profileHref}
          className="group flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-md ring-1 ring-zinc-200 backdrop-blur transition hover:bg-white hover:shadow-lg"
          title={displayName}
        >
          <Avatar
            name={user.name ?? user.displayName ?? '?'}
            avatarUrl={config?.auth?.admin?.avatar}
            size={36}
          />
          <span className="hidden text-sm font-medium text-zinc-700 sm:inline">
            {displayName}
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <Link
        href="/login"
        className="group flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-md ring-1 ring-zinc-200 backdrop-blur transition hover:bg-white hover:shadow-lg"
        title={t('page.guestLoginPrompt')}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <UserIcon size={20} aria-hidden />
        </span>
        <span className="text-sm font-medium text-zinc-700">
          {t('page.guest')}
        </span>
        <LogIn
          size={14}
          className="text-zinc-400 transition group-hover:text-zinc-600"
          aria-hidden
        />
      </Link>
    </div>
  );
}
