'use client';

import { useEffect, useState, type ComponentType } from 'react';
import type { HighlightConfig, HighlighterInstance, HighlighterProps } from './types';
import { resolveTheme } from './renderer-config';

/** 解析后的高亮配置 + 异步加载的语法高亮器实例 */
export interface UseMarkdownConfigResult {
  cfg: HighlightConfig;
  highlighter: HighlighterInstance | null;
}

/**
 * 解析 highlight 配置并按需加载语法高亮模块。
 * - cfg.theme 变化时重新加载高亮主题。
 * - 加载失败时降级为 null，由 CodeBlock 走 PlainCodeBlock 路径。
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
    ...highlightProp,
  };

  const [highlighter, setHighlighter] = useState<HighlighterInstance | null>(null);

  useEffect(() => {
    const themeName = resolveTheme(cfg.theme);
    Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
    ]).then(([prismMod, stylesMod]) => {
      const mod = stylesMod as Record<string, Record<string, React.CSSProperties>>;
      const style: Record<string, React.CSSProperties> = mod[themeName] ?? mod.vscDarkPlus ?? {};
      setHighlighter({
        Component: prismMod.default as ComponentType<HighlighterProps>,
        style,
      });
    }).catch((error) => {
      console.error('代码高亮模块加载失败，降级为普通代码块:', error);
    });
  }, [cfg.theme]);

  return { cfg, highlighter };
}
