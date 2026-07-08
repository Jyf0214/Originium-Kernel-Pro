// FooterWrapper - 服务端包装组件
// 在构建时读取 config.yaml，将配置作为 props 传递给客户端 Footer 组件。
// 适用于 GitHub Pages 等静态导出场景，避免运行时调用 /api/config。

import { loadConfig } from '@/lib/config';
import Footer from './index';
import type { FooterConfigData } from './types';

/**
 * 将 AppConfig.footer 转换为 FooterConfigData 格式
 */
function toFooterConfigData(appConfig: ReturnType<typeof loadConfig>): FooterConfigData | undefined {
  const footer = appConfig.footer;
  if (!footer) return undefined;
  return {
    owner: footer.owner,
    customText: '',
    runtime: footer.runtime,
    socialLinks: footer.socialLinks,
    links: footer.links,
    badges: footer.badges,
    typedTextPrefix: footer.typedTextPrefix,
    typedText: footer.typedText,
  };
}

/**
 * 从 config.yaml 提取社交链接 URL
 */
function extractSocialData(appConfig: ReturnType<typeof loadConfig>): Record<string, string> {
  const social: Record<string, string> = {};
  if (appConfig.social?.Github) social.Github = appConfig.social.Github;
  if (appConfig.social?.Twitter) social.Twitter = appConfig.social.Twitter;
  if (appConfig.social?.Weibo) social.Weibo = appConfig.social.Weibo;
  if (appConfig.social?.Email) social.Email = appConfig.social.Email;
  return social;
}

export default function FooterWrapper() {
  const appConfig = loadConfig();
  const staticConfig = toFooterConfigData(appConfig);
  const staticSocial = extractSocialData(appConfig);

  return <Footer staticConfig={staticConfig} staticSocial={staticSocial} />;
}
