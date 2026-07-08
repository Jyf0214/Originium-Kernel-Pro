#!/usr/bin/env node

/**
 * 构建时生成 public/site-config.json
 *
 * 将 config.yaml 中的外观配置预渲染为静态 JSON 文件，
 * 客户端组件直接 fetch('/site-config.json') 获取，无需运行时 API 调用。
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const root = join(import.meta.dirname, '..');
const configPath = join(root, 'config.yaml');

if (!existsSync(configPath)) {
  console.log('[generate-site-config] config.yaml 不存在，跳过');
  process.exit(0);
}

const raw = yaml.load(readFileSync(configPath, 'utf-8'));

const siteConfig = {
  site: raw.site ?? {},
  appearance: {
    background: raw.appearance?.background ?? {},
    customCSS: raw.appearance?.customCSS ?? '',
    loading: {
      slogans: raw.appearance?.loading?.slogans ?? [],
    },
  },
  footer: raw.footer ?? {},
  social: raw.social ?? {},
};

writeFileSync(
  join(root, 'public', 'site-config.json'),
  JSON.stringify(siteConfig, null, 2) + '\n',
);

console.log('[generate-site-config] 已生成 public/site-config.json');
