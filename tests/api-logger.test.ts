import { describe, test, expect, vi, beforeEach } from 'vitest';

/* ============================
 * Mock 声明（必须在顶层）
 * ============================ */

const mockLog = vi.spyOn(console, 'log').mockImplementation(() => { /* noop */ });
const mockWarn = vi.spyOn(console, 'warn').mockImplementation(() => { /* noop */ });
const mockError = vi.spyOn(console, 'error').mockImplementation(() => { /* noop */ });

import { createApiLogger } from '@/lib/api-logger';

/* ============================
 * 测试套件
 * ============================ */

describe('createApiLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ---------- info ---------- */

  describe('info 方法', () => {
    test('调用 console.log 并输出 [API] 前缀', () => {
      const logger = createApiLogger('/api/test');
      logger.info('GET', '查询成功');

      expect(mockLog).toHaveBeenCalledTimes(1);
      const output = mockLog.mock.calls[0]![0] as string;
      expect(output).toMatch(/^\[API\] /);
    });

    test('输出 JSON 包含 endpoint、level、method、message', () => {
      const logger = createApiLogger('/api/users');
      logger.info('POST', '创建用户');

      const output = mockLog.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe('INFO');
      expect(parsed.endpoint).toBe('/api/users');
      expect(parsed.method).toBe('POST');
      expect(parsed.message).toBe('创建用户');
      expect(parsed.time).toBeDefined();
    });

    test('带 details 时输出中包含 details', () => {
      const logger = createApiLogger('/api/test');
      logger.info('GET', '查询完成', { count: 5 });

      const output = mockLog.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed.details).toEqual({ count: 5 });
    });

    test('不带 details 时输出中不含 details 字段', () => {
      const logger = createApiLogger('/api/test');
      logger.info('GET', '查询完成');

      const output = mockLog.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed).not.toHaveProperty('details');
    });
  });

  /* ---------- warn ---------- */

  describe('warn 方法', () => {
    test('调用 console.warn', () => {
      const logger = createApiLogger('/api/test');
      logger.warn('DELETE', '权限不足');

      expect(mockWarn).toHaveBeenCalledTimes(1);
    });

    test('输出 level 为 WARN', () => {
      const logger = createApiLogger('/api/test');
      logger.warn('DELETE', '权限不足');

      const output = mockWarn.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe('WARN');
      expect(parsed.method).toBe('DELETE');
      expect(parsed.message).toBe('权限不足');
    });
  });

  /* ---------- error ---------- */

  describe('error 方法', () => {
    test('调用 console.error', () => {
      const logger = createApiLogger('/api/test');
      logger.error('POST', '服务器错误', { stack: 'Error at ...' });

      expect(mockError).toHaveBeenCalledTimes(1);
    });

    test('输出 level 为 ERROR 并携带 details', () => {
      const logger = createApiLogger('/api/submit');
      logger.error('POST', '提交失败', { errno: 500 });

      const output = mockError.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe('ERROR');
      expect(parsed.endpoint).toBe('/api/submit');
      expect(parsed.details).toEqual({ errno: 500 });
    });
  });

  /* ---------- debug ---------- */

  describe('debug 方法', () => {
    test('调用 console.log（与 info 相同通道）', () => {
      const logger = createApiLogger('/api/test');
      logger.debug('GET', '调试信息');

      expect(mockLog).toHaveBeenCalledTimes(1);
    });

    test('输出 level 为 DEBUG', () => {
      const logger = createApiLogger('/api/test');
      logger.debug('GET', '调试信息');

      const output = mockLog.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe('DEBUG');
      expect(parsed.message).toBe('调试信息');
    });
  });

  /* ---------- 时间戳格式 ---------- */

  describe('时间戳', () => {
    test('时间戳为 ISO 8601 格式', () => {
      const logger = createApiLogger('/api/test');
      logger.info('GET', '检查时间戳');

      const output = mockLog.mock.calls[0]![0] as string;
      const jsonStr = output.replace('[API] ', '');
      const parsed = JSON.parse(jsonStr);

      // 验证是合法的 ISO 日期字符串
      expect(new Date(parsed.time).toISOString()).toBe(parsed.time);
    });
  });

  /* ---------- 多次调用隔离性 ---------- */

  describe('多次调用', () => {
    test('同一 logger 多次调用互不干扰', () => {
      const logger = createApiLogger('/api/test');
      logger.info('GET', '第一次');
      logger.warn('POST', '第二次');
      logger.error('DELETE', '第三次');

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(1);

      const infoOutput = mockLog.mock.calls[0]![0] as string;
      const warnOutput = mockWarn.mock.calls[0]![0] as string;
      const errorOutput = mockError.mock.calls[0]![0] as string;

      expect(infoOutput).toContain('第一次');
      expect(warnOutput).toContain('第二次');
      expect(errorOutput).toContain('第三次');
    });

    test('不同 endpoint 的 logger 独立工作', () => {
      const logger1 = createApiLogger('/api/users');
      const logger2 = createApiLogger('/api/posts');

      logger1.info('GET', '用户列表');
      logger2.info('GET', '帖子列表');

      expect(mockLog).toHaveBeenCalledTimes(2);

      const out1 = mockLog.mock.calls[0]![0] as string;
      const out2 = mockLog.mock.calls[1]![0] as string;

      expect(out1).toContain('/api/users');
      expect(out2).toContain('/api/posts');
    });
  });

  /* ---------- 默认导出 ---------- */

  describe('默认导出', () => {
    test('createApiLogger 是默认导出', async () => {
      const mod = await import('@/lib/api-logger');
      expect(mod.default).toBe(mod.createApiLogger);
    });
  });
});
