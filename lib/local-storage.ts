/** 安全读取 localStorage，不可用时返回 null */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 安全写入 localStorage，不可用时静默忽略 */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage 不可用，忽略
  }
}

/** 安全删除 localStorage 项，不可用时静默忽略 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage 不可用，忽略
  }
}
