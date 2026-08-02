import { expect, test, describe } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Default config validation', () => {
  test('config.yaml should contain required default fields', () => {
    const configPath = path.join(process.cwd(), 'config.yaml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf-8')) as { site?: { title?: string; lang?: string }; access?: unknown; auth?: unknown };
    expect(config.site?.title).toBeDefined();
    expect(config.site?.lang).toBe('zh-CN');
    expect(config.access).toBeDefined();
    expect(config.auth).toBeDefined();
  });
});
