'use client';

import { useEffect } from 'react';
import { getRandomTabTitle } from '@/lib/kaomoji';

/**
 * 标题切换组件：用户切出标签页时，将标题改为可爱颜文字提示
 * 用户切回时恢复原始标题
 *
 * 参考：许多博客框架（如 Hexo 的 tab-title 插件）都有此功能
 */
export function TabTitleSwitch() {
  useEffect(() => {
    const originalTitle = document.title;

    const handleVisibility = () => {
      if (document.hidden) {
        document.title = getRandomTabTitle();
      } else {
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.title = originalTitle;
    };
  }, []);

  return null;
}
