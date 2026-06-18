/**
 * Body 滚动锁 — 引用计数，支持多个模态框同时打开
 * lockCount 为 0 时才真正解锁，避免一个模态框关闭导致另一个的滚动锁失效
 */

let lockCount = 0;

export function lockScroll(): void {
  if (lockCount === 0) {
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

export function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}
