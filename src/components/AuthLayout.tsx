'use client';

import { type FC, type PropsWithChildren } from 'react';
import Image from 'next/image';
import { authStyles } from './style';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useI18n } from '@/hooks/use-i18n';

/**
 * 认证页面全屏布局 — 顶部品牌（Logo + 站点名 + slogan）、中部内容、底部版权
 * 暗色跟随站点主题切换（与全站 useThemeMode 一致），而非系统偏好
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const { isDark } = useThemeMode();
  const { t } = useI18n();

  return (
    <div style={authStyles.outer} className="h-full w-full p-2 flex flex-col">
      <div style={isDark ? authStyles.innerDark : authStyles.innerLight} className="h-full w-full flex flex-col">
        {/* 品牌标题 — Logo + 站点名 + slogan */}
        <div className="flex items-center justify-between w-full px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
              <Image
                src="/favicon.svg"
                alt="Originium Kernel"
                width={36}
                height={36}
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Originium Kernel</span>
          </div>
          <span className="hidden sm:block text-sm text-zinc-400 dark:text-zinc-500">
            {t('auth.slogan')}
          </span>
        </div>

        {/* 居中内容 */}
        <div className="flex-1 flex items-center justify-center w-full p-4">
          {children}
        </div>

        {/* 底部版权 */}
        <div className="flex items-center justify-center py-6">
          <span className="text-sm text-zinc-400 text-center">
            Originium Kernel © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;