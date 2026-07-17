/**
 * AppConfig TypeScript 类型定义
 *
 * 与 config-schema.ts 中的 Zod schema 保持字段一致。
 * 手写 interface 而非 z.infer，保留原 next.config.ts 中
 * 标记为 `?` 的可选项语义。
 */

// ============================================================================
// 基础类型
// ============================================================================

export interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

export interface AppearanceConfig {
  /** 全局基础字号(px),默认 16,可在网页端配置 */
  fontSize?: number;
  /** 自定义 favicon 路径,仅允许本地路径(如 /favicon.ico),默认使用浏览器默认 */
  favicon?: string;
  background: {
    url: string;
    opacity: number;
  };
  customCSS: string;
  customHead: string;
  loading?: {
    page?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd' | 'progress';
      color?: string;
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    navigation?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd' | 'progress';
      color?: string;
    };
    slogans?: string[];
  };
  effects?: EffectsConfig;
}

export interface EffectsConfig {
  mouseClick: boolean;
  backgroundParticles: boolean;
  confetti: boolean;
}

export interface AccessSection {
  public: string[];
  private: string[];
}

export interface AccessConfig {
  posts: AccessSection;
  faces: AccessSection;
  diary: AccessSection;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthConfig {}

export interface AvatarConfig {
  url: string;
}

// ============================================================================
// Nav / Mourn / Highlight / Copy / Cover
// ============================================================================

export interface NavMenuItem {
  name: string;
  link: string;
  icon?: string;
}

export interface NavMenuGroup {
  title: string;
  item: NavMenuItem[];
}

export interface NavConfig {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroup[];
}

export interface MournConfig {
  enable: boolean;
  days: string[];
}

export interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

export interface CopyConfig {
  enable: boolean;
  copyright: {
    enable: boolean;
    limitCount: number;
  };
}

export type SocialConfig = Record<string, string>;

export interface CoverConfig {
  indexEnable: boolean;
  asideEnable: boolean;
  archivesEnable: boolean;
  position: 'left' | 'right' | 'both';
  defaultCover: string[];
}

export interface ErrorImgConfig {
  flink: string;
  postPage: string;
}

// ============================================================================
// PostMeta / WordCount / Toc / Copyright / Reward / PostEdit / Share / MainTone
// ============================================================================

export interface PostMetaDisplayConfig {
  dateType: 'created' | 'updated' | 'both';
  dateFormat: 'date' | 'relative' | 'simple';
  categories: boolean;
  tags: boolean;
  label: boolean;
}

export interface PostMetaPostConfig extends PostMetaDisplayConfig {
  unread: boolean;
}

export interface PostMetaConfig {
  page: PostMetaDisplayConfig & { dateFormat: 'date' | 'relative' | 'simple' };
  post: PostMetaPostConfig;
}

export interface WordCountConfig {
  enable: boolean;
  postWordcount: boolean;
  min2read: boolean;
  totalWordcount: boolean;
}

export interface TocConfig {
  post: boolean;
  page: boolean;
  number: boolean;
  expand: boolean;
  styleSimple: boolean;
}

export interface CopyrightConfig {
  enable: boolean;
  decode: boolean;
  authorHref: string;
  license: string;
  licenseUrl: string;
  authorLink: string;
  labels?: {
    authorSection: string;
    authorPrefix: string;
    sourcePrefix: string;
    licensePrefix: string;
    original: string;
    reprint: string;
  };
  copyTemplate?: {
    authorLine: string;
    licensePrefix: string;
    sourcePrefix: string;
  };
}

export interface QRCodeItem {
  img: string;
  link: string;
  text: string;
}

export interface RewardConfig {
  enable: boolean;
  qrCodes: QRCodeItem[];
}

export interface PostEditConfig {
  enable: boolean;
  github: string | false;
}

export interface SharejsConfig {
  enable: boolean;
  sites: string;
}

export interface AddtoanyConfig {
  enable: boolean;
  item: string;
}

export interface ShareConfig {
  sharejs: SharejsConfig;
  addtoany: AddtoanyConfig;
}

export interface MainToneConfig {
  enable: boolean;
  mode: 'cdn' | 'api' | 'both';
}

// ============================================================================
// Footer / Music
// ============================================================================

export interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

export interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
  timeFormat: string;
  onlineHours: { start: number; end: number };
  statusText: { online: string; offline: string };
}

export interface FooterSocialLink {
  name: string;
  icon: string;
}

export interface FooterLinkItem {
  name: string;
  url: string;
}

export interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

export interface FooterBadge {
  name: string;
  url: string;
}

export interface FooterConfig {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
  socialLinks?: FooterSocialLink[];
  links?: FooterLinkGroup[];
  badges?: FooterBadge[];
  typedTextPrefix?: string;
  typedText?: string[];
  typedTextSpeed?: { type: number; delete: number; pause: number };
  scrollToTopText?: string;
}

export interface MusicItem {
  name: string;
  artist: string;
  url: string;
  cover: string;
}

export interface MusicConfig {
  enable: boolean;
  autoPlay: boolean;
  songs: MusicItem[];
}

// ============================================================================
// 根配置
// ============================================================================

export interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
  avatar: AvatarConfig;
  nav?: NavConfig;
  mourn?: MournConfig;
  highlight?: HighlightConfig;
  copy?: CopyConfig;
  social?: SocialConfig;
  cover?: CoverConfig;
  errorImg?: ErrorImgConfig;
  postMeta?: PostMetaConfig;
  wordcount?: WordCountConfig;
  toc?: TocConfig;
  copyright?: CopyrightConfig;
  reward?: RewardConfig;
  postEdit?: PostEditConfig;
  share?: ShareConfig;
  mainTone?: MainToneConfig;
  footer?: FooterConfig;
  music?: MusicConfig;
}
