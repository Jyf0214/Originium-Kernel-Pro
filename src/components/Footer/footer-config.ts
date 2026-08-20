// Footer 静态配置 + 默认值兜底 + 远程配置加载 hook
// 与 UI 渲染解耦，方便单元测试和复用。

import { FOOTER_CONFIG, SOCIAL_DATA } from '@/data/site-config';
import { getTranslate } from '@/i18n/translate';

import type {
  FooterBadge,
  FooterConfigData,
  FooterLinkGroup,
} from './types';

// ─── Default Data（配置为空时的兜底） ───────────────

export const DEFAULT_FOOTER_LINKS: FooterLinkGroup[] = [
  {
    group: getTranslate('footerConfig.groupService'),
    items: [
      { name: getTranslate('footerConfig.aboutUs'), url: '/about' },
      { name: getTranslate('footerConfig.privacyPolicy'), url: '/about' },
      { name: getTranslate('footerConfig.termsOfService'), url: '/about' },
    ],
  },
  {
    group: getTranslate('footerConfig.groupSocial'),
    items: [
      { name: 'GitHub', url: 'https://github.com/Jyf0214' },
      { name: 'Twitter', url: '#' },
      { name: getTranslate('footerConfig.weibo'), url: '#' },
    ],
  },
  {
    group: getTranslate('footerConfig.groupNavigation'),
    items: [
      { name: getTranslate('footerConfig.home'), url: '/' },
      { name: getTranslate('footerConfig.articles'), url: '/posts' },
      { name: getTranslate('footerConfig.diary'), url: '/diary' },
      { name: getTranslate('footerConfig.contacts'), url: '/faces' },
    ],
  },
];

export const DEFAULT_FOOTER_BADGES: FooterBadge[] = [
  { name: 'Next.js', url: 'https://nextjs.org/' },
  { name: 'Prisma', url: 'https://www.prisma.io/' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
];

export const DEFAULT_FOOTER_TYPED_TEXTS = [getTranslate('footerConfig.typedText1'), getTranslate('footerConfig.typedText2'), getTranslate('footerConfig.typedText3')];
const DEFAULT_TIME_FORMAT = getTranslate('footerBrand.defaultTimeFormat');

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
    statusText: resolveVal(cfg?.statusText, { online: getTranslate('footerBrand.online'), offline: getTranslate('footerBrand.offline') }),
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
    // typedText 空数组表示关闭打字机（FooterBar 在 texts 为空时不渲染），仅 undefined 时回退默认三条
    typedText: resolveVal(config?.typedText, DEFAULT_FOOTER_TYPED_TEXTS),
    typedTextPrefix: resolveVal(config?.typedTextPrefix, ''),
    typedTextSpeed: resolveVal(config?.typedTextSpeed, { type: 100, delete: 50, pause: 2000 }),
    scrollToTopText: resolveVal(config?.scrollToTopText, getTranslate('footerConfig.scrollToTop')),
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
