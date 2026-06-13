import { getSecret } from './auth';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const PREFIX = 'aes_gcm:';

let cachedKey: Promise<CryptoKey> | null = null;

async function deriveKey(): Promise<CryptoKey> {
  cachedKey ??= (async () => {
    const keyData = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(getSecret()));
    return crypto.subtle.importKey('raw', keyData, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
  })();
  return cachedKey;
}

export async function encryptContent(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);
  return PREFIX + Buffer.from(combined).toString('base64');
}

export async function decryptContent(stored: string): Promise<string> {
  if (!stored.startsWith(PREFIX)) return stored;
  const combined = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const data = combined.subarray(IV_LENGTH);
  const key = await deriveKey();
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

/**
 * 批量并行解密多条内容
 * 使用 Promise.all 实现并行解密，减少 I/O 等待时间
 */
export async function decryptContentBatch(storedList: string[]): Promise<string[]> {
  return Promise.all(storedList.map((stored) => decryptContent(stored)));
}
