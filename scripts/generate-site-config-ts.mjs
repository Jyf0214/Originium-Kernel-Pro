#!/usr/bin/env node

/**
 * 构建时生成 data/site-config.ts
 *
 * 从 config.yaml 读取全部前端所需配置，输出为 TypeScript 模块，
 * 供 useConfig / BackgroundProvider / FontSizeProvider 等直接 import，
 * 无需运行时调用 /api/config。
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const root = join(import.meta.dirname, '..');
const configPath = join(root, 'config.yaml');

if (!existsSync(configPath)) {
  console.log('[generate-site-config] config.yaml 不存在，跳过');
  process.exit(0);
}

const raw = yaml.load(readFileSync(configPath, 'utf-8'));

// 前端需要的配置字段（与 FrontendConfig 类型对齐）
const frontendConfig = {
  site: raw.site ?? {},
  appearance: raw.appearance ?? {},
  share: raw.share ?? {},
  mainTone: raw.mainTone ?? {},
  footer: raw.footer ?? {},
  highlight: raw.highlight ?? {},
  cover: raw.cover ?? {},
  errorImg: raw.errorImg ?? {},
  postMeta: raw.postMeta ?? {},
  wordcount: raw.wordcount ?? {},
  toc: raw.toc ?? {},
  copy: raw.copy ?? {},
  copyright: raw.copyright ?? {},
  reward: raw.reward ?? {},
  postEdit: raw.postEdit ?? {},
  auth: raw.auth ?? {},
  avatar: raw.avatar ?? {},
  music: raw.music ?? {},
};

const socialData = raw.social ?? {};

const dataDir = join(root, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const code = `/** 构建时自动生成，请勿手动编辑 — 来源: config.yaml */
import type { FrontendConfig } from '@/hooks/use-config';
import type { FooterConfigData } from '@/components/Footer/types';

/** 前端完整配置（替代 /api/config GET） */
export const SITE_CONFIG: FrontendConfig = ${JSON.stringify(frontendConfig, null, 2)};

/** 社交链接 URL 字典 */
export const SOCIAL_DATA: Record<string, string> = ${JSON.stringify(socialData, null, 2)};

/** 页脚配置（Footer 专用） */
export const FOOTER_CONFIG: FooterConfigData | null = ${JSON.stringify(raw.footer ?? null, null, 2)};
`;

writeFileSync(join(dataDir, 'site-config.ts'), code);

console.log('[generate-site-config] 已生成 data/site-config.ts');
