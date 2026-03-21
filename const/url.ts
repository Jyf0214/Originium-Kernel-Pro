/**
 * URL Constants
 * 
 * URL 常量配置 - 参考 LobeChat const
 * @see https://github.com/lobehub/lobe-chat/blob/main/packages/const/src/url.ts
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */

// 环境判断
const isDev = process.env.NODE_ENV === 'development';

// 官方 URL（可配置为实际部署地址）
export const OFFICIAL_URL = isDev ? 'http://localhost:3000' : 'https://your-domain.com';
export const OFFICIAL_SITE = OFFICIAL_URL;
export const OFFICIAL_DOMAIN = new URL(OFFICIAL_URL).hostname;

// GitHub 相关
export const GITHUB = 'https://github.com/Jyf0214/ZhouZBoss-Web';
export const GITHUB_ISSUES = `${GITHUB}/issues/new/choose`;

// 文档和隐私政策
export const DOCUMENTS = `${OFFICIAL_SITE}/docs`;
export const PRIVACY_URL = `${OFFICIAL_SITE}/privacy`;
export const TERMS_URL = `${OFFICIAL_SITE}/terms`;

// 反馈和帮助
export const FEEDBACK = GITHUB_ISSUES;

// 图片 URL
export const imageUrl = (filename: string) => `/images/${filename}`;

// 会话聊天 URL
export const SESSION_CHAT_URL = (agentId: string, mobile?: boolean) => {
  if (mobile) return `/agent/${agentId}`;
  return `/agent/${agentId}`;
};

// Agent 相关 URL
export const AGENT_PROFILE_URL = (agentId: string) => `/agent/${agentId}/profile`;

// 下载 URL
export const DOWNLOAD_URL = {
  android: undefined,
  default: `${OFFICIAL_SITE}/downloads`,
  ios: undefined,
} as const;
