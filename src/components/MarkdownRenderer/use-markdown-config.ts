'use client';

import { useEffect, useRef, useState } from 'react';
import type { HighlightConfig } from './types';

/** 解析后的高亮配置 + 异步加载的 rehype-pretty-code 插件 */
export interface UseMarkdownConfigResult {
  cfg: HighlightConfig;
  rehypePlugin: unknown[] | null;
}

/**
 * 解析 highlight 配置并按需加载 rehype-pretty-code 插件。
 * - 加载失败时降级为 null，代码块走无高亮路径。
 * - 使用 mountedRef 丢弃卸载后的异步结果。
 */
export function useMarkdownConfig(
  highlightProp: HighlightConfig | undefined,
): UseMarkdownConfigResult {
  const cfg: HighlightConfig = {
    theme: 'dark',
    copy: true,
    lang: true,
    shrink: false,
    heightLimit: 330,
    wordWrap: true,
    lineNumbers: false,
    ...highlightProp,
  };

  const [rehypePlugin, setRehypePlugin] = useState<unknown[] | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    import('rehype-pretty-code').then((mod) => {
      if (!mountedRef.current) return;
      setRehypePlugin([[mod.default, { theme: 'github-dark-dimmed' }]]);
    }).catch((error) => {
      if (!mountedRef.current) return;
      console.error('rehype-pretty-code 加载失败，代码块将无语法高亮:', error);
    });

    return () => { mountedRef.current = false; };
  }, []);

  return { cfg, rehypePlugin };
}
