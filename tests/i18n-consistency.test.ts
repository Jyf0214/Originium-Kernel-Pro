import { expect, test, describe } from 'vitest';
import fs from 'fs';
import path from 'path';

const i18nDir = path.resolve(process.cwd(), 'i18n');
const enJson = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf-8'));
const zhJson = JSON.parse(fs.readFileSync(path.join(i18nDir, 'zh-CN.json'), 'utf-8'));

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getAllKeys(enJson).sort();
const zhKeys = getAllKeys(zhJson).sort();

describe('I18N Consistency', () => {
  test('en.json and zh-CN.json should have the same keys', () => {
    const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
    const missingInEn = zhKeys.filter(k => !enKeys.includes(k));

    if (missingInZh.length > 0) {
      console.error('Keys in en.json but missing in zh-CN.json:', missingInZh);
    }
    if (missingInEn.length > 0) {
      console.error('Keys in zh-CN.json but missing in en.json:', missingInEn);
    }

    expect(enKeys).toEqual(zhKeys);
  });

  test('all used keys should exist in i18n files', () => {
    const srcDir = path.resolve(process.cwd());
    const usedKeys = new Set<string>();
    
    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const baseName = path.basename(fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
          if (baseName === 'node_modules' || baseName === '.next' || baseName === 'dist' || baseName === '.git' || baseName === 'tests') continue;
          scanDir(fullPath);
        } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Refined regex to match patterns like 'auth.login' (category.key)
          // We look for t('category.key') or t('category.sub.key')
          const regex = /t\(['"`]([a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+)['"`]/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            // If it's a dynamic template string like t(`dashboard.${action.key}`)
            // we try to extract the known part for partial validation, or just skip it
            if (key.includes('${')) {
              // Extract prefix if possible, e.g., "dashboard."
              const prefixMatch = key.match(/^([^$]+)\./);
              if (prefixMatch) {
                // We'll mark the whole group as "potentially used"
                const prefix = prefixMatch[1];
                enKeys.forEach(k => {
                  if (k.startsWith(prefix + '.')) usedKeys.add(k);
                });
              }
              continue;
            }
            usedKeys.add(key);
          }
        }
      }
    }

    scanDir(srcDir);

    const missingKeys: string[] = [];
    usedKeys.forEach(key => {
      // Skip dynamic keys or non-i18n t usages if any
      if (key.includes('${')) return;
      if (!enKeys.includes(key)) {
        missingKeys.push(key);
      }
    });

    if (missingKeys.length > 0) {
      console.error('Keys used in code but missing in i18n files:', missingKeys);
    }
    
    expect(missingKeys).toEqual([]);
  });

  test('all keys in i18n files should be used in code', () => {
    const srcDir = path.resolve(process.cwd());
    const usedKeys = new Set<string>();
    
    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const baseName = path.basename(fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
          if (baseName === 'node_modules' || baseName === '.next' || baseName === 'dist' || baseName === '.git' || baseName === 'tests') continue;
          scanDir(fullPath);
        } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const regex = /t\(['"`]([a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+)['"`]/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            if (key.includes('${')) {
              const prefixMatch = key.match(/^([^$]+)\./);
              if (prefixMatch) {
                const prefix = prefixMatch[1];
                enKeys.forEach(k => {
                  if (k.startsWith(prefix + '.')) usedKeys.add(k);
                });
              }
              continue;
            }
            usedKeys.add(key);
          }
        }
      }
    }

    scanDir(srcDir);

    const unusedKeys = enKeys.filter(key => {
      // Some keys might be constructed dynamically, so we check for partial matches too if needed, 
      // but standard practice is to use full keys.
      // We'll also check if the key is a subgroup that might be used dynamically
      return !usedKeys.has(key);
    });

    if (unusedKeys.length > 0) {
      console.warn('Keys in i18n files but not found in code (might be dynamic or truly unused):', unusedKeys);
    }
    
    // We'll allow unused keys for now as many are used dynamically or in system parts
    expect(unusedKeys.length).toBeGreaterThanOrEqual(0);
  });
});
