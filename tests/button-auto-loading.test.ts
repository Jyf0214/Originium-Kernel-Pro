/**
 * Button 自动加载状态 — 最小显示时长验证
 *
 * 背景：
 *   用户反馈点击 Button 后「根本没有体验到」转圈圈。
 *   根因：原实现用 `Promise.resolve(onClick?.(e)).finally(setLoading(false))`，
 *   当 onClick 是同步函数时，setLoading(true) 与 setLoading(false)
 *   在同一微任务内连续触发，loading 状态可能从未被渲染，
 *   或仅渲染 1 帧（< 16ms），用户感知不到。
 *
 * 修复：
 *   抽出纯函数 `runWithMinLoadingDuration`，强制 loading 状态保持
 *   `MIN_LOADING_DURATION_MS`（默认 400ms）至少这段时间。
 *
 * 本测试不依赖 react-testing-library / jsdom，直接对纯函数做时间相关断言。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWithMinLoadingDuration, MIN_LOADING_DURATION_MS } from '@/components/ui/Button/use-auto-loading';

describe('Button useAutoLoading — runWithMinLoadingDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Date.now 也要 mock,因为函数内部用 Date.now() 计算 elapsed
    vi.setSystemTime(new Date('2026-06-07T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('同步 action 完成后,loading 状态必须保持至少 MIN_LOADING_DURATION_MS', () => {
    const setLoading = vi.fn();
    const action = vi.fn(() => undefined);

    runWithMinLoadingDuration(setLoading, action);

    // 立即调用:应该 setLoading(true) 一次
    expect(setLoading).toHaveBeenCalledTimes(1);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(action).toHaveBeenCalledTimes(1);

    // 时间推进到 399ms — loading 仍应保持
    vi.advanceTimersByTime(MIN_LOADING_DURATION_MS - 1);
    expect(setLoading).toHaveBeenCalledTimes(1);

    // 时间推进到 400ms — 此时 setLoading(false) 触发
    vi.advanceTimersByTime(1);
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('Promise action 在 100ms 内完成时,loading 也要保持到 400ms', async () => {
    const setLoading = vi.fn();
    let resolveAction!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) => {
      resolveAction = resolve;
    }));

    runWithMinLoadingDuration(setLoading, action);

    expect(setLoading).toHaveBeenNthCalledWith(1, true);

    // 推进 100ms 后 resolve promise
    vi.advanceTimersByTime(100);
    resolveAction();

    // 等待微任务队列清空 (finally 是 microtask)
    // 之后 release 会计算 elapsed=100,remaining=300,注册 setTimeout(300)
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // 此时 setLoading(false) 还没执行 (在 setTimeout 队列里,未触发)
    expect(setLoading).toHaveBeenCalledTimes(1);

    // 推进剩余 300ms,触发 setTimeout
    vi.advanceTimersByTime(300);
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('Promise action 耗时超过 minMs 时,loading 在 action 完成后立即解除', async () => {
    const setLoading = vi.fn();
    let resolveAction!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) => {
      resolveAction = resolve;
    }));

    runWithMinLoadingDuration(setLoading, action);

    // 推进 500ms 后再 resolve
    vi.advanceTimersByTime(500);
    resolveAction();
    await vi.runAllTimersAsync();

    // elapsed(500ms) > minMs(400ms),所以应该 setLoading(false) 立即执行
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('自定义 minMs 参数生效', () => {
    const setLoading = vi.fn();
    const action = vi.fn(() => undefined);

    runWithMinLoadingDuration(setLoading, action, 1000);

    expect(setLoading).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(999);
    expect(setLoading).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('action 抛同步异常时,loading 状态仍被正确解除', () => {
    const setLoading = vi.fn();
    const action = vi.fn(() => {
      throw new Error('boom');
    });

    expect(() => runWithMinLoadingDuration(setLoading, action)).toThrow('boom');

    // action 同步抛错,release 立即被调用,setLoading(false) 会在 400ms 后
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(MIN_LOADING_DURATION_MS);
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('重复调用 release 是幂等的(防止多次 setLoading(false))', async () => {
    const setLoading = vi.fn();
    let resolveAction!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) => {
      resolveAction = resolve;
    }));

    runWithMinLoadingDuration(setLoading, action);

    // 模拟:同时多次 resolve (promise 已 resolve,后续调用为 no-op,但 finally 只注册一次)
    resolveAction();
    resolveAction();
    resolveAction();

    // 等待微任务队列清空,让 release 跑一次
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // 推进时间到超过 minMs,触发 setLoading(false)
    vi.advanceTimersByTime(MIN_LOADING_DURATION_MS + 100);

    // setLoading(true) 1 次,setLoading(false) 1 次 (released 锁生效,即使再次调用 release 也不会重复)
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });
});

describe('Button useAutoLoading — 最小显示时长常量', () => {
  it('MIN_LOADING_DURATION_MS 至少 300ms(可感知阈值)', () => {
    expect(MIN_LOADING_DURATION_MS).toBeGreaterThanOrEqual(300);
  });

  it('MIN_LOADING_DURATION_MS 不超过 1500ms(避免过度延迟)', () => {
    expect(MIN_LOADING_DURATION_MS).toBeLessThanOrEqual(1500);
  });
});
