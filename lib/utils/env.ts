/**
 * Environment Utilities
 * 
 * 环境检测工具函数 - 参考 LobeChat utils
 * @see https://github.com/lobehub/lobe-chat/blob/main/packages/utils/src/env.ts
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */

/**
 * 检查是否为开发环境
 */
export const isDev = process.env.NODE_ENV === 'development';

/**
 * 检查是否在服务器端
 */
export const isOnServerSide = typeof window === 'undefined';

/**
 * 检查是否在浏览器端
 */
export const isOnClientSide = typeof window !== 'undefined';

/**
 * 检查是否为生产环境
 */
export const isProd = process.env.NODE_ENV === 'production';
