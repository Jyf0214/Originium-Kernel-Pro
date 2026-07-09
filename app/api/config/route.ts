import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfig, clearConfigCache, type AppConfig } from '@/lib/config';
import { getFileFromGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import { zAppConfig } from '@/lib/config-schema';
import { logAudit } from '@/lib/audit';
import yaml from 'js-yaml';

const logger = createApiLogger('/api/config');

/**
 * 通用配置段合并:override 存在时以 base(或 defaults)为基础展开 override。
 * 适用于大多数结构为"扁平或浅层嵌套 + 可选默认值"的配置段。
 * 复杂嵌套合并(如 appearance、postMeta)仍保留专用函数。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeSection<T extends Record<string, any>>(
  base: T | undefined,
  override: Partial<T> | undefined,
  defaults?: T,
): T | undefined {
  if (!override) return base;
  return { ...(defaults ?? base), ...override } as T;
}

function mergeAppearance(
  base: AppConfig['appearance'],
  override: Partial<AppConfig['appearance']> | undefined,
): AppConfig['appearance'] {
  if (!override) return base;
  const background = override.background
    ? { ...base.background, ...override.background }
    : base.background;
  const baseLoading = base.loading ?? { page: { type: 'spinner' as const }, navigation: { type: 'spinner' as const }, slogans: [] as string[] };
  const ovLoading = override.loading;
  const loading = ovLoading
    ? {
        page: { ...baseLoading.page, ...ovLoading.page } as typeof baseLoading.page,
        navigation: { ...baseLoading.navigation, ...ovLoading.navigation } as typeof baseLoading.navigation,
        slogans: ovLoading.slogans ?? baseLoading.slogans,
      }
    : baseLoading;
  return {
    fontSize: override.fontSize ?? base.fontSize,
    background,
    customCSS: override.customCSS ?? base.customCSS,
    customHead: override.customHead ?? base.customHead,
    loading,
    effects: override.effects ?? base.effects,
  };
}

function mergeAccess(
  base: AppConfig['access'],
  override: Partial<AppConfig['access']> | undefined,
): AppConfig['access'] {
  if (!override) return base;
  return {
    posts: { ...base.posts, ...override.posts },
    faces: { ...base.faces, ...override.faces },
    diary: { ...base.diary, ...override.diary },
  };
}

function mergePostMeta(
  base: AppConfig['postMeta'],
  override: Partial<AppConfig['postMeta']> | undefined,
): AppConfig['postMeta'] | undefined {
  if (!override) return base;
  const def: AppConfig['postMeta'] = { page: { dateType: 'created', dateFormat: 'simple', categories: true, tags: true, label: false }, post: { dateType: 'both', dateFormat: 'date', categories: true, tags: true, label: true, unread: false } };
  const baseFull = { ...def, ...base };
  return {
    ...baseFull,
    ...override,
    page: { ...baseFull.page, ...override.page },
    post: { ...baseFull.post, ...override.post },
  };
}

/** 合并 App 配置:每个段调用 mergeSection 或专用合并函数 */
function mergeAppConfig(
  base: AppConfig,
  override: Partial<AppConfig>,
): AppConfig {
  return {
    // site: 逐字段覆盖(base 无默认值,override 直接展开即可)
    site: { ...base.site, ...override.site },
    appearance: mergeAppearance(base.appearance, override.appearance),
    access: mergeAccess(base.access, override.access),
    auth: { ...base.auth, ...override.auth },
    avatar: override.avatar ?? base.avatar,
    nav: mergeSection(base.nav, override.nav, { enable: false, travelling: false, clock: false, menu: [] }),
    mourn: mergeSection(base.mourn, override.mourn, { enable: false, days: [] }),
    highlight: mergeSection(base.highlight, override.highlight, { theme: 'light', copy: true, lang: true, shrink: false, heightLimit: 330, wordWrap: true }),
    copy: mergeSection(base.copy, override.copy, { enable: true, copyright: { enable: false, limitCount: 50 } }),
    social: mergeSection(base.social, override.social, {}),
    cover: mergeSection(base.cover, override.cover, { indexEnable: true, asideEnable: true, archivesEnable: true, position: 'left', defaultCover: [] }),
    errorImg: mergeSection(base.errorImg, override.errorImg, { flink: '/img/friend_404.gif', postPage: '/img/404.jpg' }),
    postMeta: mergePostMeta(base.postMeta, override.postMeta),
    wordcount: mergeSection(base.wordcount, override.wordcount, { enable: false, postWordcount: false, min2read: true, totalWordcount: false }),
    toc: mergeSection(base.toc, override.toc, { post: true, page: false, number: true, expand: false, styleSimple: false }),
    copyright: mergeSection(base.copyright, override.copyright, { enable: true, decode: false, authorHref: '', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', authorLink: '/' }),
    reward: mergeSection(base.reward, override.reward, { enable: true, qrCodes: [] }),
    postEdit: mergeSection(base.postEdit, override.postEdit, { enable: false, github: false }),
    share: mergeSection(base.share, override.share, { sharejs: { enable: true, sites: 'facebook,twitter,wechat,weibo,qq' }, addtoany: { enable: false, item: 'facebook,twitter,wechat,sina_weibo,email,copy_link' } }),
    mainTone: mergeSection(base.mainTone, override.mainTone, { enable: false, mode: 'api' }),
    footer: mergeSection(base.footer, override.footer, { owner: { enable: true, since: 2020 }, customText: '', runtime: { enable: false, launchTime: '04/01/2021 00:00:00' } }),
    clerk: override.clerk ?? base.clerk,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('POST', '无权限访问', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  logger.info('POST', '开始更新配置', { role: session.role });

  try {
    const rawConfig = await req.json() as Partial<AppConfig>;
    // PUT 有 Zod 校验，POST 也必须有，防止非法配置写入
    const validated = zAppConfig.partial().safeParse(rawConfig);
    if (!validated.success) {
      return NextResponse.json(
        { error: '配置校验失败: ' + validated.error.issues.map(i => i.path.join('.')).join(', ') },
        { status: 400 }
      );
    }
    const currentConfig = loadConfig();
    const mergedConfig = mergeAppConfig(currentConfig, validated.data);

    // 持久化到 GitHub（如果配置了远程仓库）
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubRepo && githubToken) {
      const yamlContent = yaml.dump(mergedConfig, { lineWidth: -1 });
      const ghRes = await fetch(`${new URL(req.url).origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          path: 'config.yaml',
          content: yamlContent,
          message: 'chore: update site config',
        }),
      });
      if (!ghRes.ok) {
        const ghErr = await ghRes.json().catch(() => ({}));
        logger.error('POST', '配置写入 GitHub 失败', { error: ghErr.error });
        return NextResponse.json({ error: '配置保存到远程仓库失败' }, { status: 500 });
      }
    }

    logger.info('POST', '配置已合并并持久化');
    void logAudit('config_update', 'config', '站点配置已更新', session.uid);
    clearConfigCache();
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: unknown) {
    logger.error('POST', '更新配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

/**
 * 从 GitHub 拉取配置
 */
export async function PUT() {
  // 认证检查：仅管理员或超级管理员可同步远程配置
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('PUT', '无权限访问', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  logger.info('PUT', '开始从 GitHub 同步配置', { role: session.role });
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    logger.warn('PUT', 'GitHub 未配置');
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const remote = await getFileFromGithub(repo, token, 'config.yaml');
    if (!remote) {
      logger.warn('PUT', 'config.yaml 不存在');
      return NextResponse.json({ error: 'config.yaml 不存在' }, { status: 404 });
    }
    const parsed = yaml.load(remote.content) as Partial<AppConfig>;
    const validated = zAppConfig.safeParse(parsed);
    if (!validated.success) {
      logger.warn('PUT', '远程 YAML Zod 校验失败', { issues: validated.error.issues.map(i => i.path.join('.')) });
      return NextResponse.json({ error: '远程配置校验失败: ' + validated.error.issues.map(i => i.path.join('.')).join(', ') }, { status: 400 });
    }
    const currentConfig = loadConfig();
    const mergedConfig = mergeAppConfig(currentConfig, validated.data);

    logger.info('PUT', '从 GitHub 同步配置成功');
    void logAudit('config_update', 'config', '站点配置已从 GitHub 同步更新', session.uid);
    clearConfigCache();
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('PUT', '从 GitHub 同步配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}