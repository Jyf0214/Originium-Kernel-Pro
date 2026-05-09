/**
 * 系统常量定义
 */

/** 文章删除等待期（天） */
export const DELETION_PERIOD_DAYS = 30;

/** Session 过期时间（毫秒） */
export const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Session 过期时间（字符串，用于 JWT） */
export const SESSION_EXPIRY = '7d';
