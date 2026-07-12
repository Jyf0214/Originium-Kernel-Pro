// Footer 静态配置 + 默认值兜底 + 远程配置加载 hook
// 与 UI 渲染解耦，方便单元测试和复用。

import {
  Github,
  Twitter,
  Globe,
  Mail,
  type LucideIcon,
} from 'lucide-react';

import { FOOTER_CONFIG, SOCIAL_DATA } from '@/data/site-config';

import type {
  FooterBadge,
  FooterConfigData,
  FooterLinkGroup,
  FooterSocialEntry,
  FooterSocialLink,
} from './types';

// ─── Icon Mapping ────────────────────────────────────
// 将配置中的 icon 名称映射为 lucide-react 组件

export const FOOTER_ICON_MAP: Record<string, LucideIcon> = {
  Github,
  GitHub: Github,
  Twitter,
  Weibo: Globe,
  Email: Mail,
  Mail,
  Globe,
};

/** 根据名称解析图标，缺失时回退到 Globe */
export function resolveFooterIcon(name: string): LucideIcon {
  return FOOTER_ICON_MAP[name] ?? Globe;
}

// ─── Default Data（配置为空时的兜底） ───────────────

export const DEFAULT_FOOTER_LINKS: FooterLinkGroup[] = [
  {
    group: '服务',
    items: [
      { name: '关于我们', url: '/about' },
      { name: '隐私政策', url: '/about' },
      { name: '服务条款', url: '/about' },
    ],
  },
  {
    group: '社交',
    items: [
      { name: 'GitHub', url: 'https://github.com/Jyf0214' },
      { name: 'Twitter', url: '#' },
      { name: '微博', url: '#' },
    ],
  },
  {
    group: '导航',
    items: [
      { name: '首页', url: '/' },
      { name: '文章', url: '/posts' },
      { name: '日记', url: '/diary' },
      { name: '通讯录', url: '/faces' },
    ],
  },
  {
    group: '协议',
    items: [
      { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
    ],
  },
];

export const DEFAULT_FOOTER_BADGES: FooterBadge[] = [
  { name: 'Next.js', url: 'https://nextjs.org/' },
  { name: 'Prisma', url: 'https://www.prisma.io/' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
];

export const DEFAULT_FOOTER_TYPED_TEXTS = ['Next.js 驱动', 'TypeScript 构建', '用心守护'];

// ─── Social Entries 解析 ────────────────────────────
// 合并 socialLinks 配置和 socialData 字典为统一的有序条目

export function buildSocialEntries(
  socialData: Record<string, string>,
  socialLinksConfig?: FooterSocialLink[],
): FooterSocialEntry[] {
  if (socialLinksConfig && socialLinksConfig.length > 0) {
    return socialLinksConfig
      .map((sl) => ({ sl, url: socialData[sl.name] }))
      // 过滤掉 socialData 中缺失的链接，类型守卫同时收窄 url
      .filter((entry): entry is { sl: FooterSocialLink; url: string } => Boolean(entry.url))
      .map(({ sl, url }) => ({ name: sl.name, url, icon: sl.icon }));
  }
  return Object.entries(socialData)
    .filter(([, url]) => Boolean(url))
    .map(([name, url]) => ({ name, url, icon: name }));
}

// ─── Default Value Resolver ──────────────────────────
// 将配置中的各字段统一解析为最终值，缺失时使用默认值兜底。

function resolveList<T>(value: T[] | undefined | null, fallback: T[]): T[] {
  return value && value.length > 0 ? value : fallback;
}

function resolveVal<T>(value: T | undefined | null, fallback: T): T {
  return value ?? fallback;
}

export interface ResolvedFooterDefaults {
  links: FooterLinkGroup[];
  badges: FooterBadge[];
  typedText: string[];
  typedTextPrefix: string;
  owner: FooterConfigData['owner'];
  author: string;
  customText: string;
  runtimeEnable: boolean;
  launchTime: string;
}

export function resolveDefaults(config: FooterConfigData | null): ResolvedFooterDefaults {
  const owner = config?.owner;
  return {
    links: resolveList(config?.links, DEFAULT_FOOTER_LINKS),
    badges: resolveList(config?.badges, DEFAULT_FOOTER_BADGES),
    typedText: resolveList(config?.typedText, DEFAULT_FOOTER_TYPED_TEXTS),
    typedTextPrefix: resolveVal(config?.typedTextPrefix, '本站由 '),
    owner: resolveVal(owner, { enable: true, since: 2020 }),
    author: resolveVal(owner?.author, 'Originium Kernel'),
    customText: resolveVal(config?.customText, ''),
    runtimeEnable: resolveVal(config?.runtime?.enable, false),
    launchTime: resolveVal(config?.runtime?.launchTime, ''),
  };
}

// ─── Config Hook ─────────────────────────────────────
// 构建时通过 data/footer-config.ts 内嵌配置，无需运行时 API 调用。
// 支持通过 props 传入静态配置（服务端组件 FooterWrapper），优先使用 props。

export interface UseFooterConfigResult {
  config: FooterConfigData | null;
  socialData: Record<string, string> | null;
  error: string | null;
}

export function useFooterConfig(staticConfig?: FooterConfigData, staticSocial?: Record<string, string>): UseFooterConfigResult {
  const config = staticConfig ?? FOOTER_CONFIG;
  const socialData = staticSocial ?? SOCIAL_DATA;
  return { config, socialData, error: null };
}
