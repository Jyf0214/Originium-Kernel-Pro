/**
 * 文章加密共享模块
 *
 * 供三处使用，必须保持一致：
 * - scripts/encrypt-posts.mts（作者加密工具，写入密文到 md 文件）
 * - src/app/posts/[...slug]/page.tsx（构建时识别密文，只下发密文不下发正文）
 * - src/components/ArticleEncryption.tsx（客户端验证密码后解密渲染）
 *
 * 密文格式（单行，写在 md 正文位置）：
 *   aes_gcm:v2:<saltB64>:<ivB64>:<cipherB64>
 *
 * KDF：PBKDF2-SHA256，100000 次迭代派生 32 字节 AES-GCM 密钥。
 * 密钥由明文密码派生，frontmatter 中的 password（SHA-256）仅用于
 * 密码正确性校验，拿到哈希无法解密（与旧版"哈希即钥匙"不同）。
 */

/** 密文行前缀（版本化，便于未来升级 KDF/算法） */
export const ARTICLE_CIPHER_PREFIX = 'aes_gcm:v2:';

/** PBKDF2 迭代次数 */
export const ARTICLE_PBKDF2_ITERATIONS = 100000;

/** 解密所需的密文参数（base64 字符串，可安全进入客户端 props） */
export interface ArticleCryptoPayload {
  salt: string;
  iv: string;
  ciphertext: string;
  iterations: number;
}

/** 从正文内容识别并解析密文参数，非密文返回 null */
export function parseEncryptedArticle(content: string): ArticleCryptoPayload | null {
  if (!content.startsWith(ARTICLE_CIPHER_PREFIX)) return null;
  const parts = content.slice(ARTICLE_CIPHER_PREFIX.length).trim().split(':');
  const [salt, iv, ciphertext] = parts;
  if (!salt || !iv || !ciphertext) return null;
  return { salt, iv, ciphertext, iterations: ARTICLE_PBKDF2_ITERATIONS };
}

/* ── base64 编解码（不依赖 Buffer/atob，浏览器与 Node 通用） ── */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] ?? 0) : 0;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] ?? 0) : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : '=';
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const clean = b64.replace(/=+$/, '').split('').filter((c) => B64_CHARS.includes(c)).join('');
  const byteLen = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(new ArrayBuffer(byteLen));
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64_CHARS.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (out < byteLen) bytes[out++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}

/* ── 加解密 ── */

/** 用密码派生 AES-GCM 密钥（PBKDF2-SHA256） */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const keyBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  );
  return crypto.subtle.importKey('raw', keyBits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 加密正文，返回密文行（写入 md 文件正文位置） */
export async function encryptArticle(content: string, password: string): Promise<{ payload: ArticleCryptoPayload; encryptedContent: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ARTICLE_PBKDF2_ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(content));
  const payload: ArticleCryptoPayload = {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
    iterations: ARTICLE_PBKDF2_ITERATIONS,
  };
  return { payload, encryptedContent: `${ARTICLE_CIPHER_PREFIX}${payload.salt}:${payload.iv}:${payload.ciphertext}` };
}

/** 客户端解密（验证密码通过后调用），返回明文 Markdown */
export async function decryptArticle(password: string, payload: ArticleCryptoPayload): Promise<string> {
  const key = await deriveKey(password, base64ToBytes(payload.salt), payload.iterations);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );
  return new TextDecoder().decode(plain);
}