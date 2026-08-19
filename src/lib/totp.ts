/**
 * TOTP 双因素认证工具函数
 * 基于 otplib v13，在服务端（API route）中使用
 */
import crypto from 'crypto';
import { OTP } from 'otplib';
import { getSecret } from '@/lib/auth';

/** TOTP 应用名称，显示在验证器 App 中 */
const APP_NAME = 'OriginiumKernel';

/** OTP 实例，使用 TOTP 策略 */
const otp = new OTP({ strategy: 'totp' });

/**
 * 生成 TOTP 密钥（随机 base32 字符串）
 */
export function generateTotpSecret(): string {
  return otp.generateSecret();
}

/**
 * 生成 otpauth:// URI（用于 QR 码扫描）
 */
export function generateTotpUri(secret: string, email: string): string {
  return otp.generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

/**
 * 验证 TOTP 码
 * @param token 用户输入的 6 位验证码
 * @param secret 用户的 TOTP 密钥
 * @returns 是否验证通过
 */
export function verifyTotp(token: string, secret: string): boolean {
  // 验证前清理输入：去除空格、破折号等非数字字符
  const cleanToken = token.replace(/[\s\-]/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }
  const result = otp.verifySync({ token: cleanToken, secret });
  return result.valid;
}

/** 恢复码字符集（排除易混淆的 0/O/1/I） */
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 单个恢复码格式：XXXX-XXXX */
const RECOVERY_CODE_PATTERN = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

/**
 * 生成 2FA 一次性恢复码（默认 8 个）
 * 验证器丢失时用于恢复登录，每个恢复码只能使用一次
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = '';
    for (let j = 0; j < 8; j++) {
      raw += RECOVERY_CODE_ALPHABET[crypto.randomInt(RECOVERY_CODE_ALPHABET.length)];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * 哈希恢复码（HMAC-SHA256，与 API 密钥哈希同模式）
 * 存储侧只保留哈希，明文仅在启用时展示一次
 */
export function hashRecoveryCode(code: string): string {
  // 复用会话签名密钥；生产环境缺失时 getSecret 会直接抛错，禁止降级
  return crypto.createHmac('sha256', getSecret()).update(code).digest('hex');
}

/**
 * 校验恢复码并返回其哈希（用于一次性消费）
 * @param input 用户输入
 * @param hashes 已存储的恢复码哈希数组
 * @returns 匹配的哈希，未匹配返回 null
 */
export function matchRecoveryCode(input: string, hashes: string[]): string | null {
  const code = input.trim().toUpperCase();
  if (!RECOVERY_CODE_PATTERN.test(code)) return null;
  const inputHash = hashRecoveryCode(code);
  for (const stored of hashes) {
    const a = Buffer.from(inputHash, 'hex');
    const b = Buffer.from(stored, 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return stored;
    }
  }
  return null;
}
