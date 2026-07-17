/**
 * AppConfig Zod Schema
 * Zod schema 完整描述 AppConfig 配置，类型定义在 config-types.ts。
 * 根级 .strict() 拒绝未知 key；子 schema .default() 保证 parse({}) 得到完整对象。
 */

import { z } from 'zod';

// ============================================================================
// 工具:把"已带 field defaults 的子 schema"再包一层,使其在父级缺失时
// 也能给出"完整字段已填充"的默认值 (而不是只填 {})
// ============================================================================

/**
 * 给子 schema 加上"用自身默认值填好"的 .default
 *
 * 背景:Zod 中 `z.object({a: z.string().default('x')}).default({})`
 * 解析缺失字段时返回的是字面值 `{}`,**不会**再触发 a 的默认。
 * 这导致 `zAppConfig.parse({})` 得到的子对象字段全空。
 * 用 `schema.default(schema.parse({}))` 作为兜底,
 * 让默认值就是"按 field defaults 跑完一遍 parse 之后的结果"。
 *
 * 使用方式:任何把"带嵌套结构的子 schema"挂到父 schema 的属性时,
 * 都应包一层 withFullDefault,以保证任意层级 parse({}) 都能拿到完整对象。
 */
const withFullDefault = <T extends z.ZodObject>(s: T): z.ZodDefault<T> =>
  s.default(s.parse({}) as never);

// ============================================================================
// 基础枚举
// ============================================================================

const zLoadingType = z.enum(['spinner', 'text', 'dots', 'glow', 'waves', 'antd', 'progress']);
const zLoadingPosition = z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
const zDateType = z.enum(['created', 'updated', 'both']);
const zDateFormat = z.enum(['date', 'relative', 'simple']);
const zCoverPosition = z.enum(['left', 'right', 'both']);
const zMainToneMode = z.enum(['cdn', 'api', 'both']);

// ============================================================================
// SiteConfig
// ============================================================================

export const zSiteConfig = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  heroTitleLine1: z.string().default(''),
  heroTitleLine2: z.string().default(''),
  lang: z.string().default('zh-CN'),
});

// ============================================================================
// EffectsConfig
// ============================================================================

export const zEffectsConfig = z.object({
  mouseClick: z.boolean().default(false),
  backgroundParticles: z.boolean().default(false),
  confetti: z.boolean().default(false),
});

// ============================================================================
// AppearanceConfig
// ============================================================================

export const zAppearanceConfig = z.object({
  fontSize: z.number().int().positive().default(16),
  favicon: z.string().refine(
    (v) => v === '' || v.startsWith('/'),
    { message: 'favicon 必须是本地路径(以 / 开头),不支持外部 URL' },
  ).default(''),
  background: withFullDefault(z.object({
    url: z.string().default(''),
    opacity: z.number().min(0).max(1).default(1),
  })),
  customCSS: z.string().default(''),
  customHead: z.string().default(''),
  loading: withFullDefault(z.object({
    page: withFullDefault(z.object({
      type: zLoadingType.default('spinner'),
      color: z.string().default('#c084fc'),
      position: zLoadingPosition.default('center'),
    })),
    navigation: withFullDefault(z.object({
      type: zLoadingType.default('spinner'),
      color: z.string().default('#c084fc'),
    })),
    slogans: z.array(z.string()).default([]),
  })),
  effects: withFullDefault(zEffectsConfig),
});

// ============================================================================
// AccessConfig
// ============================================================================

export const zAccessSection = z.object({
  public: z.array(z.string()).default([]),
  private: z.array(z.string()).default([]),
});

export const zAccessConfig = z.object({
  posts: withFullDefault(zAccessSection),
  faces: withFullDefault(zAccessSection),
  diary: withFullDefault(zAccessSection),
});

// ============================================================================
// AvatarConfig — 全站唯一头像来源
// ============================================================================

export const zAvatarConfig = z.object({
  url: z.string().default(''),
});

// ============================================================================
// AuthConfig (保留空对象以兼容已有配置结构)
// ============================================================================

export const zAuthConfig = z.object({});

// ============================================================================
// NavConfig
// ============================================================================

export const zNavMenuItem = z.object({
  name: z.string().default(''),
  link: z.string().default(''),
  icon: z.string().optional(),
});

export const zNavMenuGroup = z.object({
  title: z.string().default(''),
  item: z.array(zNavMenuItem).default([]),
});

export const zNavConfig = z.object({
  enable: z.boolean().default(false),
  travelling: z.boolean().default(false),
  clock: z.boolean().default(false),
  menu: z.array(zNavMenuGroup).default([]),
});

// ============================================================================
// MournConfig
// ============================================================================

export const zMournConfig = z.object({
  enable: z.boolean().default(false),
  days: z.array(z.string()).default([]),
});

// ============================================================================
// HighlightConfig
// ============================================================================

export const zHighlightConfig = z.object({
  theme: z.string().default('light'),
  copy: z.boolean().default(true),
  lang: z.boolean().default(true),
  shrink: z.boolean().default(false),
  heightLimit: z.number().int().nonnegative().default(330),
  wordWrap: z.boolean().default(true),
});

// ============================================================================
// CopyConfig
// ============================================================================

export const zCopyConfig = z.object({
  enable: z.boolean().default(true),
  copyright: withFullDefault(z.object({
    enable: z.boolean().default(false),
    limitCount: z.number().int().nonnegative().default(50),
  })),
});

// ============================================================================
// SocialConfig (Record<string, string>)
// ============================================================================

export const zSocialConfig = z.record(z.string(), z.string());

// ============================================================================
// CoverConfig
// ============================================================================

export const zCoverConfig = z.object({
  indexEnable: z.boolean().default(true),
  asideEnable: z.boolean().default(true),
  archivesEnable: z.boolean().default(true),
  position: zCoverPosition.default('left'),
  defaultCover: z.array(z.string()).default([]),
});

// ============================================================================
// ErrorImgConfig
// ============================================================================

export const zErrorImgConfig = z.object({
  flink: z.string().default('/img/friend_404.gif'),
  postPage: z.string().default('/img/404.jpg'),
});

// ============================================================================
// PostMetaConfig
// ============================================================================

export const zPostMetaDisplayConfig = z.object({
  dateType: zDateType.default('created'),
  dateFormat: zDateFormat.default('date'),
  categories: z.boolean().default(true),
  tags: z.boolean().default(true),
  label: z.boolean().default(false),
});

export const zPostMetaPostConfig = z.object({
  dateType: zDateType.default('created'),
  dateFormat: zDateFormat.default('date'),
  categories: z.boolean().default(true),
  tags: z.boolean().default(true),
  label: z.boolean().default(true),
  unread: z.boolean().default(false),
});

export const zPostMetaConfig = z.object({
  page: withFullDefault(zPostMetaDisplayConfig),
  post: withFullDefault(zPostMetaPostConfig),
});

// ============================================================================
// WordCountConfig
// ============================================================================

export const zWordCountConfig = z.object({
  enable: z.boolean().default(false),
  postWordcount: z.boolean().default(false),
  min2read: z.boolean().default(true),
  totalWordcount: z.boolean().default(false),
});

// ============================================================================
// TocConfig
// ============================================================================

export const zTocConfig = z.object({
  post: z.boolean().default(true),
  page: z.boolean().default(false),
  number: z.boolean().default(true),
  expand: z.boolean().default(false),
  styleSimple: z.boolean().default(false),
});

// ============================================================================
// CopyrightConfig
// ============================================================================

export const zCopyrightConfig = z.object({
  enable: z.boolean().default(true),
  decode: z.boolean().default(false),
  authorHref: z.string().default(''),
  license: z.string().default('CC BY-NC-SA 4.0'),
  licenseUrl: z.string().default('https://creativecommons.org/licenses/by-nc-sa/4.0/'),
  authorLink: z.string().default('/'),
  labels: z.object({
    authorSection: z.string().default('本文作者'),
    authorPrefix: z.string().default('作者: '),
    sourcePrefix: z.string().default('来源: '),
    licensePrefix: z.string().default('许可: '),
    original: z.string().default('原创'),
    reprint: z.string().default('转载'),
  }).optional(),
  copyTemplate: z.object({
    authorLine: z.string().default('本文著作权归作者所有'),
    licensePrefix: z.string().default('许可协议: '),
    sourcePrefix: z.string().default('来源: '),
  }).optional(),
});

// ============================================================================
// RewardConfig
// ============================================================================

export const zQRCodeItem = z.object({
  img: z.string().default(''),
  link: z.string().default(''),
  text: z.string().default(''),
});

export const zRewardConfig = z.object({
  enable: z.boolean().default(true),
  qrCodes: z.array(zQRCodeItem).default([]),
});

// ============================================================================
// PostEditConfig
// ============================================================================

export const zPostEditConfig = z.object({
  enable: z.boolean().default(false),
  github: z.union([z.string(), z.literal(false)]).default(false),
});

// ============================================================================
// ShareConfig
// ============================================================================

export const zSharejsConfig = z.object({
  enable: z.boolean().default(true),
  sites: z.string().default('facebook,twitter,wechat,weibo,qq'),
});

export const zAddtoanyConfig = z.object({
  enable: z.boolean().default(false),
  item: z.string().default('facebook,twitter,wechat,sina_weibo,email,copy_link'),
});

export const zShareConfig = z.object({
  sharejs: withFullDefault(zSharejsConfig),
  addtoany: withFullDefault(zAddtoanyConfig),
});

// ============================================================================
// MainToneConfig
// ============================================================================

export const zMainToneConfig = z.object({
  enable: z.boolean().default(false),
  mode: zMainToneMode.default('api'),
});

// ============================================================================
// FooterConfig
// ============================================================================

export const zFooterOwnerConfig = z.object({
  enable: z.boolean().default(true),
  since: z.number().int().nonnegative().default(2026),
  author: z.string().optional(),
});

export const zFooterRuntimeConfig = z.object({
  enable: z.boolean().default(false),
  launchTime: z.string().default('04/01/2021 00:00:00'),
  timeFormat: z.string().default('本站已运行 {days} 天 {hours} 小时 {minutes} 分 {seconds} 秒'),
  onlineHours: z.object({
    start: z.number().int().min(0).max(23).default(9),
    end: z.number().int().min(0).max(23).default(18),
  }).default({ start: 9, end: 18 }),
  statusText: z.object({
    online: z.string().default('在线'),
    offline: z.string().default('休息中'),
  }).default({ online: '在线', offline: '休息中' }),
});

export const zFooterSocialLink = z.object({
  name: z.string().default(''),
  icon: z.string().default(''),
});

export const zFooterLinkItem = z.object({
  name: z.string().default(''),
  url: z.string().default(''),
});

export const zFooterLinkGroup = z.object({
  group: z.string().default(''),
  items: z.array(zFooterLinkItem).default([]),
});

export const zFooterBadge = z.object({
  name: z.string().default(''),
  url: z.string().default(''),
});

export const zFooterConfig = z.object({
  owner: withFullDefault(zFooterOwnerConfig),
  customText: z.string().default(''),
  runtime: withFullDefault(zFooterRuntimeConfig),
  socialLinks: z.array(zFooterSocialLink).optional(),
  links: z.array(zFooterLinkGroup).optional(),
  badges: z.array(zFooterBadge).optional(),
  typedTextPrefix: z.string().optional(),
  typedText: z.array(z.string()).optional(),
  typedTextSpeed: z.object({
    type: z.number().int().positive().default(100),
    delete: z.number().int().positive().default(50),
    pause: z.number().int().positive().default(2000),
  }).optional(),
  scrollToTopText: z.string().optional(),
});

// ============================================================================
// MusicConfig
// ============================================================================

export const zMusicItem = z.object({
  name: z.string().default(''),
  artist: z.string().default(''),
  url: z.string().default(''),
  cover: z.string().default(''),
});

export const zMusicConfig = z.object({
  enable: z.boolean().default(false),
  autoPlay: z.boolean().default(false),
  songs: z.array(zMusicItem).default([]),
});

// ============================================================================
// UserConfig / Users & Root AppConfig
// ============================================================================

export const zUserConfig = z.object({ avatar: z.string().optional() });

/**
 * 根 schema:在解析时启用 .strict() 拒绝根级未知 key。
 * 子 schema 走 Zod 默认的 strip 模式,未声明的子键会被自动丢弃。
 * 所有顶层字段均通过 withFullDefault 包一层,确保 zAppConfig.parse({}) 能得到全字段默认配置。
 */
export const zAppConfig = z.object({
  site: withFullDefault(zSiteConfig),
  appearance: withFullDefault(zAppearanceConfig),
  access: withFullDefault(zAccessConfig),
  auth: withFullDefault(zAuthConfig),
  avatar: withFullDefault(zAvatarConfig),
  nav: withFullDefault(zNavConfig),
  mourn: withFullDefault(zMournConfig),
  highlight: withFullDefault(zHighlightConfig),
  copy: withFullDefault(zCopyConfig),
  social: zSocialConfig.default({}),
  cover: withFullDefault(zCoverConfig),
  errorImg: withFullDefault(zErrorImgConfig),
  postMeta: withFullDefault(zPostMetaConfig),
  wordcount: withFullDefault(zWordCountConfig),
  toc: withFullDefault(zTocConfig),
  copyright: withFullDefault(zCopyrightConfig),
  reward: withFullDefault(zRewardConfig),
  postEdit: withFullDefault(zPostEditConfig),
  share: withFullDefault(zShareConfig),
  mainTone: withFullDefault(zMainToneConfig),
  footer: withFullDefault(zFooterConfig),
  music: withFullDefault(zMusicConfig),
}).strict();

// ============================================================================
// 推导出的 TypeScript 类型 (供业务代码直接 import)
// ============================================================================
//
// 手写 interface 已迁移至 config-types.ts，此处 re-export 保持兼容。
// ============================================================================

export type {
  SiteConfig,
  AppearanceConfig,
  AccessSection,
  AccessConfig,
  AuthConfig,
  AvatarConfig,
  NavMenuItem,
  NavMenuGroup,
  NavConfig,
  MournConfig,
  HighlightConfig,
  CopyConfig,
  SocialConfig,
  CoverConfig,
  ErrorImgConfig,
  PostMetaDisplayConfig,
  PostMetaPostConfig,
  PostMetaConfig,
  WordCountConfig,
  TocConfig,
  CopyrightConfig,
  QRCodeItem,
  RewardConfig,
  PostEditConfig,
  SharejsConfig,
  AddtoanyConfig,
  ShareConfig,
  MainToneConfig,
  FooterOwnerConfig,
  FooterRuntimeConfig,
  FooterSocialLink,
  FooterLinkItem,
  FooterLinkGroup,
  FooterBadge,
  FooterConfig,
  MusicItem,
  MusicConfig,
  EffectsConfig,
  AppConfig,
} from './config-types';
