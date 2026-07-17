// Footer 静态配置 + 默认值兜底 + 远程配置加载 hook
// 与 UI 渲染解耦，方便单元测试和复用。

import { FOOTER_CONFIG, SOCIAL_DATA } from '@/data/site-config';

import type {
  FooterBadge,
  FooterConfigData,
  FooterLinkGroup,
} from './types';

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

export const DEFAULT_FOOTER_TYPED_TEXTS = ['用心记录每一天', '文字是最长情的告白', '生活需要仪式感'];
const DEFAULT_TIME_FORMAT = '本站已运行 {days} 天 {hours} 小时 {minutes} 分 {seconds} 秒';

// ─── Default Value Resolver ──────────────────────────
// 将配置中的各字段统一解析为最终值，缺失时使用默认值兜底。

function resolveList<T>(value: T[] | undefined | null, fallback: T[]): T[] {
  return value && value.length > 0 ? value : fallback;
}

function resolveVal<T>(value: T | undefined | null, fallback: T): T {
  return value ?? fallback;
}

function resolveRuntime(cfg: FooterConfigData['runtime'] | undefined) {
  return {
    enable: resolveVal(cfg?.enable, false),
    launchTime: resolveVal(cfg?.launchTime, ''),
    timeFormat: resolveVal(cfg?.timeFormat, DEFAULT_TIME_FORMAT),
    onlineHours: resolveVal(cfg?.onlineHours, { start: 9, end: 18 }),
    statusText: resolveVal(cfg?.statusText, { online: '在线', offline: '休息中' }),
  };
}

export interface ResolvedFooterDefaults {
  links: FooterLinkGroup[];
  badges: FooterBadge[];
  typedText: string[];
  typedTextPrefix: string;
  typedTextSpeed: { type: number; delete: number; pause: number };
  scrollToTopText: string;
  owner: FooterConfigData['owner'];
  author: string;
  customText: string;
  runtimeEnable: boolean;
  launchTime: string;
  timeFormat: string;
  onlineHours: { start: number; end: number };
  statusText: { online: string; offline: string };
}

export function resolveDefaults(config: FooterConfigData | null): ResolvedFooterDefaults {
  const owner = config?.owner;
  const rt = resolveRuntime(config?.runtime);
  return {
    links: resolveList(config?.links, DEFAULT_FOOTER_LINKS),
    badges: resolveList(config?.badges, DEFAULT_FOOTER_BADGES),
    typedText: resolveList(config?.typedText, DEFAULT_FOOTER_TYPED_TEXTS),
    typedTextPrefix: resolveVal(config?.typedTextPrefix, ''),
    typedTextSpeed: resolveVal(config?.typedTextSpeed, { type: 100, delete: 50, pause: 2000 }),
    scrollToTopText: resolveVal(config?.scrollToTopText, '回到顶部'),
    owner: resolveVal(owner, { enable: true, since: 2026 }),
    author: resolveVal(owner?.author, 'Jyf0214'),
    customText: resolveVal(config?.customText, ''),
    runtimeEnable: rt.enable,
    launchTime: rt.launchTime,
    timeFormat: rt.timeFormat,
    onlineHours: rt.onlineHours,
    statusText: rt.statusText,
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
