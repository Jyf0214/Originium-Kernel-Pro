import { NextResponse } from 'next/server';
import { loadConfig, clearConfigCache, type AppConfig } from '@/lib/config';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { zAppConfig } from '@/lib/config-schema';
import { logAudit } from '@/lib/audit';
import yaml from 'js-yaml';

const logger = createApiLogger('/api/config');

/**
 * 通用配置段合并:override 存在时以 base 为基础展开 override。
 * base 来自 loadConfig()，已通过 Zod schema 获得完整默认值，无需额外 defaults。
 * 适用于大多数结构为"扁平或浅层嵌套 + 可选默认值"的配置段。
 * 复杂嵌套合并(如 appearance、postMeta)仍保留专用函数。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeSection<T extends Record<string, any>>(
  base: T | undefined,
  override: Partial<T> | undefined,
): T | undefined {
  if (!override) return base;
  return { ...(base), ...override } as T;
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
  if (!base) return override as AppConfig['postMeta'];
  return {
    ...base,
    ...override,
    page: { ...base.page, ...override.page },
    post: { ...base.post, ...override.post },
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
    nav: mergeSection(base.nav, override.nav),
    mourn: mergeSection(base.mourn, override.mourn),
    highlight: mergeSection(base.highlight, override.highlight),
    copy: mergeSection(base.copy, override.copy),
    social: mergeSection(base.social, override.social),
    cover: mergeSection(base.cover, override.cover),
    errorImg: mergeSection(base.errorImg, override.errorImg),
    postMeta: mergePostMeta(base.postMeta, override.postMeta),
    wordcount: mergeSection(base.wordcount, override.wordcount),
    toc: mergeSection(base.toc, override.toc),
    copyright: mergeSection(base.copyright, override.copyright),
    reward: mergeSection(base.reward, override.reward),
    postEdit: mergeSection(base.postEdit, override.postEdit),
    share: mergeSection(base.share, override.share),
    mainTone: mergeSection(base.mainTone, override.mainTone),
    footer: mergeSection(base.footer, override.footer),
    clerk: override.clerk ?? base.clerk,
  };
}

export const POST = apiHandler('POST', { label: 'config更新', requireAdmin: true }, async (req, _ctx, session) => {
  logger.info('POST', '开始更新配置', { role: session?.role });

  const rawConfig = await req.json() as Partial<AppConfig>;
  // PUT 有 Zod 校验，POST 也必须有，防止非法配置写入
  const validated = zAppConfig.partial().safeParse(rawConfig);
  if (!validated.success) {
    return NextResponse.json(
      { error: '配置校验失败: ' + validated.error.issues.map(i => i.path.join('.')).join(', ') },
      { status: 400 }
    );
  }
  const currentConfig = await loadConfig();
  const mergedConfig = mergeAppConfig(currentConfig, validated.data);

  // 持久化到 GitHub（如果配置了远程仓库）
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubRepo && githubToken) {
    const yamlContent = yaml.dump(mergedConfig, { lineWidth: -1 });
    try {
      await updateFileInGithub({
        repo: githubRepo,
        token: githubToken,
        path: 'config.yaml',
        content: yamlContent,
        message: 'chore: update site config',
      });
    } catch (err) {
      logger.error('POST', '配置写入 GitHub 失败', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: '配置保存到远程仓库失败' }, { status: 500 });
    }
  }

  logger.info('POST', '配置已合并并持久化');
  void logAudit('config_update', 'config', '站点配置已更新', session?.uid ?? 'unknown');
  clearConfigCache();
  return NextResponse.json({ success: true, config: mergedConfig });
});

/**
 * 从 GitHub 拉取配置
 */
export const PUT = apiHandler('PUT', { label: 'config同步', requireAdmin: true }, async (_req, _ctx, session) => {
  logger.info('PUT', '开始从 GitHub 同步配置', { role: session?.role });
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    logger.warn('PUT', 'GitHub 未配置');
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

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
  const currentConfig = await loadConfig();
  const mergedConfig = mergeAppConfig(currentConfig, validated.data);

  logger.info('PUT', '从 GitHub 同步配置成功');
  void logAudit('config_update', 'config', '站点配置已从 GitHub 同步更新', session?.uid ?? 'unknown');
  clearConfigCache();
  return NextResponse.json({ success: true, config: mergedConfig });
});