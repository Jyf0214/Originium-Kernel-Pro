import { expect, test, describe } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('默认配置验证', () => {
  test('config.yaml 应包含必要的默认字段', () => {
    const configPath = path.join(process.cwd(), 'config.yaml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    expect(config.site?.title).toBeDefined();
    expect(config.site?.lang).toBe('zh-CN');
    expect(config.access).toBeDefined();
    expect(config.auth).toBeDefined();
  });
});
