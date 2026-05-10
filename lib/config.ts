import { appConfig, type AppConfig, type SiteConfig, type AppearanceConfig, type AccessConfig, type AuthConfig, type UserConfig } from '@/next.config';
import { getDb } from '@/lib/db';

export type { AppConfig, SiteConfig, AppearanceConfig, AccessConfig, AuthConfig, UserConfig };

/**
 * 检测数据库是否可用
 */
export function hasDatabase(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

/** 默认配置 */
const defaultConfig: AppConfig = { ...appConfig };

/** 缓存已加载的配置 */
let cachedConfig: AppConfig | null = null;

/**
 * 同步加载配置（从 next.config.ts）
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = { ...defaultConfig };
  return cachedConfig;
}

/**
 * 异步加载配置，优先级：数据库 > next.config.ts > 默认值
 */
export async function loadConfigAsync(): Promise<AppConfig> {
  const fileConfig = loadConfig();

  if (!hasDatabase()) return fileConfig;

  try {
    const db = getDb();
    const dbRaw = await db.get('config:main');
    if (!dbRaw) return fileConfig;

    const dbConfig = JSON.parse(dbRaw);

    return {
      site: {
        title: dbConfig.siteTitle ?? fileConfig.site.title,
        description: dbConfig.siteDescription ?? fileConfig.site.description,
        heroTitleLine1: dbConfig.heroTitleLine1 ?? fileConfig.site.heroTitleLine1,
        heroTitleLine2: dbConfig.heroTitleLine2 ?? fileConfig.site.heroTitleLine2,
        lang: fileConfig.site.lang,
      },
      appearance: {
        background: dbConfig.background
          ? { ...fileConfig.appearance.background, ...dbConfig.background }
          : fileConfig.appearance.background,
        customCSS: dbConfig.customCSS ?? fileConfig.appearance.customCSS,
        customHead: dbConfig.customHead ?? fileConfig.appearance.customHead,
      },
      access: dbConfig.access ? { ...fileConfig.access, ...dbConfig.access } : fileConfig.access,
      auth: dbConfig.auth ? { ...fileConfig.auth, ...dbConfig.auth } : fileConfig.auth,
    };
  } catch (error) {
    console.error('数据库配置加载失败:', error);
    return fileConfig;
  }
}

/**
 * 将配置保存到数据库
 */
export async function saveConfigToDb(config: AppConfig): Promise<void> {
  if (!hasDatabase()) return;
  const db = getDb();
  const dbData = {
    siteTitle: config.site.title,
    siteDescription: config.site.description,
    heroTitleLine1: config.site.heroTitleLine1,
    heroTitleLine2: config.site.heroTitleLine2,
    background: config.appearance.background,
    customCSS: config.appearance.customCSS,
    customHead: config.appearance.customHead,
    access: config.access,
    auth: config.auth,
  };
  await db.set('config:main', JSON.stringify(dbData));
  cachedConfig = null;
}

/**
 * 判断路径是否匹配脱字符模式
 */
export function matchPath(pattern: string, target: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('^')) {
    const prefix = pattern.slice(1);
    return target === prefix || target.startsWith(prefix + '/');
  }
  return target === pattern;
}

/**
 * 判断指定路径的内容是否可被某角色访问
 */
export function canAccess(
  section: 'posts' | 'faces' | 'diary',
  slug: string,
  isAuthenticated: boolean,
  hasDb: boolean = false,
  config?: AppConfig,
): boolean {
  const rules = (config || loadConfig()).access[section];

  const isPrivate = rules.private.some((p: string) => matchPath(p, slug));
  const isPublic = rules.public.some((p: string) => matchPath(p, slug));

  if (isPrivate && !hasDb) return false;
  if (isPrivate && hasDb) return isAuthenticated;
  if (isPublic) return true;
  return isAuthenticated;
}

/**
 * 过滤可访问的路径
 */
export function filterAccessibleSlugs(
  section: 'posts' | 'faces' | 'diary',
  slugs: string[],
  hasDb: boolean = false,
): string[] {
  return slugs.filter((slug) => canAccess(section, slug, false, hasDb));
}

/**
 * 获取用户头像
 * 优先级：数据库 > config.users[uid].avatar > auth.admin.avatar（仅当用户是管理员）
 */
export async function getUserAvatarAsync(uid: string, isAdmin?: boolean): Promise<string | null> {
  const config = loadConfig();

  if (hasDatabase()) {
    try {
      const db = getDb();
      const dbAvatar = await db.get(`user:avatar:${uid}`);
      if (dbAvatar) return dbAvatar;
    } catch {
      // ignore
    }
  }

  if (config.users?.[uid]?.avatar) {
    return config.users[uid].avatar;
  }

  if (isAdmin && config.auth?.admin?.avatar) {
    return config.auth.admin.avatar;
  }

  return null;
}

/**
 * 获取用户头像（同步）
 */
export function getUserAvatar(uid: string, isAdmin?: boolean): string | null {
  const config = loadConfig();

  if (config.users?.[uid]?.avatar) {
    return config.users[uid].avatar;
  }

  if (isAdmin && config.auth?.admin?.avatar) {
    return config.auth.admin.avatar;
  }

  return null;
}

/**
 * 保存用户头像
 */
export async function saveUserAvatar(uid: string, avatar: string): Promise<void> {
  if (!hasDatabase()) return;
  const db = getDb();
  await db.set(`user:avatar:${uid}`, avatar);
}
