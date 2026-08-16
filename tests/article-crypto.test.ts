/**
 * article-crypto.ts 单元测试
 *
 * 覆盖范围:
 * - parseEncryptedArticle: 密文识别与参数解析
 * - encryptArticle / decryptArticle: 加解密往返一致性
 * - 错误密码解密失败（AES-GCM 认证失败）
 */
import { describe, test, expect } from 'vitest';
import {
  ARTICLE_CIPHER_PREFIX,
  parseEncryptedArticle,
  encryptArticle,
  decryptArticle,
} from '../src/lib/article-crypto';

describe('parseEncryptedArticle', () => {
  test('普通正文返回 null', () => {
    expect(parseEncryptedArticle('这是一段普通正文')).toBeNull();
    expect(parseEncryptedArticle('')).toBeNull();
  });

  test('密文行解析出 salt/iv/ciphertext/iterations', () => {
    const payload = parseEncryptedArticle(`${ARTICLE_CIPHER_PREFIX}YWJj:ZGVm:MTIzNDU2`);
    expect(payload).not.toBeNull();
    expect(payload?.salt).toBe('YWJj');
    expect(payload?.iv).toBe('ZGVm');
    expect(payload?.ciphertext).toBe('MTIzNDU2');
    expect(payload?.iterations).toBeGreaterThan(0);
  });

  test('前缀残缺或参数缺失返回 null', () => {
    expect(parseEncryptedArticle(ARTICLE_CIPHER_PREFIX)).toBeNull();
    expect(parseEncryptedArticle(`${ARTICLE_CIPHER_PREFIX}YWJj:ZGVm`)).toBeNull();
  });
});

describe('encryptArticle / decryptArticle', () => {
  test('加解密往返保持一致', async () => {
    const original = '# 标题\n\n正文内容，包含中文与 emoji 🎉 以及 `code`。';
    const { payload, encryptedContent } = await encryptArticle(original, '测试密码123');

    expect(encryptedContent.startsWith(ARTICLE_CIPHER_PREFIX)).toBe(true);
    // 密文不得包含明文内容
    expect(encryptedContent).not.toContain('标题');
    expect(encryptedContent).not.toContain('正文内容');

    const decrypted = await decryptArticle('测试密码123', payload);
    expect(decrypted).toBe(original);
  });

  test('错误密码解密失败（AES-GCM 认证失败）', async () => {
    const { payload } = await encryptArticle('需要保护的内容', '正确密码');
    await expect(decryptArticle('错误密码', payload)).rejects.toThrow();
  });

  test('随机盐：同一密码两次加密的密文不同', async () => {
    const a = await encryptArticle('相同内容', '同一密码');
    const b = await encryptArticle('相同内容', '同一密码');
    expect(a.encryptedContent).not.toBe(b.encryptedContent);
  });
});