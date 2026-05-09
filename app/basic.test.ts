import { expect, test, describe } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('默认配置验证', () => {
  test('config.json 应包含必要的默认字段', () => {
    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.site?.title).toBeDefined();
    expect(config.site?.lang).toBe('zh-CN');
    expect(config.access).toBeDefined();
    expect(config.auth).toBeDefined();
  });
});
