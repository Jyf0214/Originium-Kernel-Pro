'use client';

import { type FC, type PropsWithChildren } from 'react';
import { authStyles } from './style';
import { useThemeMode } from '@/hooks/use-theme-mode';

/**
 * 认证页面全屏布局 — 顶部品牌、中部内容、底部版权
 * 暗色跟随站点主题切换（与全站 useThemeMode 一致），而非系统偏好
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const { isDark } = useThemeMode();

  return (
    <div style={authStyles.outer} className="h-full w-full p-2 flex flex-col">
      <div style={isDark ? authStyles.innerDark : authStyles.innerLight} className="h-full w-full flex flex-col">
        {/* 品牌标题 */}
        <div className="flex items-center gap-2 justify-between w-full px-4 py-4">
          <span className="text-xl font-bold text-zinc-900">Originium Kernel</span>
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
