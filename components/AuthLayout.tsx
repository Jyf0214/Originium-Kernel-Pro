'use client';

import { type FC, type PropsWithChildren } from 'react';
import { authStyles } from './style';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * 认证页面全屏布局 — 顶部品牌、中部内容、底部版权
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return (
    <div style={authStyles.outer} className="h-full w-full p-2 flex flex-col">
      <div style={isDarkMode ? authStyles.innerDark : authStyles.innerLight} className="h-full w-full flex flex-col">
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
