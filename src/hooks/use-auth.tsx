'use client';

import { type ReactNode, useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import { useI18n } from './use-i18n';
import { getTranslate } from '@/i18n/translate';

/** 2FA 验证需求错误 — 携带临时令牌供调用方跳转到 2FA 页面 */
export class TwoFactorRequiredError extends Error {
  constructor(public readonly tempToken: string) {
    super('2FA verification required');
    this.name = 'TwoFactorRequiredError';
  }
}

export type UserRole = 'user' | 'admin' | 'root';

export interface User {
  uid: string;
  email: string;
  name: string;
  displayName: string;
  role: UserRole;
  userGroup?: string;
  avatar?: string;
  twoFactorEnabled?: boolean;
  /** admin 处于 sudo 模式（15 分钟提权）时为 true */
  sudoModeActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  /** 是否拥有 root 权限（root 角色或 sudo 模式激活） */
  isRoot: boolean;
  /** admin 是否处于 sudo 模式 */
  sudoModeActive: boolean;
  /** admin 进入 sudo 模式的剩余有效期（毫秒时间戳），未激活为 null */
  sudoModeExpiresAt: number | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** admin 输入密码进入 sudo 模式（15 分钟） */
  enterSudoMode: (password: string) => Promise<void>;
  /** 退出 sudo 模式 */
  exitSudoMode: () => Promise<void>;
}

/** sudo 模式时长与后端 SUDO_MODE_TTL_MS 保持一致 */
const SUDO_MODE_TTL_MS = 15 * 60 * 1000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sudoModeExpiresAt, setSudoModeExpiresAt] = useState<number | null>(null);
  const { t } = useI18n();
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (timeoutMs = 10000) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser({ ...data.user, displayName: data.user.name });
          // sudo 模式激活时本地记录到期时间；未激活则清除
          if (data.user.sudoModeActive) {
            setSudoModeExpiresAt((prev) => prev ?? Date.now() + SUDO_MODE_TTL_MS);
          } else {
            setSudoModeExpiresAt(null);
          }
        } else {
          setUser(null);
          setSudoModeExpiresAt(null);
        }
      } else {
        setUser(null);
        setSudoModeExpiresAt(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        console.warn('Auth refresh timed out');
      }
      setUser(null);
      setSudoModeExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(async (email: string, pass: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password: pass }),
      });

      if (res.status === 500) {
        message.error(t('error.500'));
        throw new Error(t('error.500'));
      }

      const data = await res.json();

      // 2FA 需求：密码正确但需要 TOTP 验证（tempToken 通过 httpOnly cookie 携带）
      if (data.requires2FA) {
        message.info(t('auth.twoFactorRequired'));
        // 返回特殊标记让调用方跳转到 2FA 页面
        throw new TwoFactorRequiredError('');
      }

      if (res.ok && data.success) {
        setUser({ ...data.user, displayName: data.user.name });
        message.success(t('auth.loginSuccess'));
      } else {
        message.error(data.error ?? t('auth.loginFailed'));
        throw new Error(data.error ?? t('auth.operationFailed'));
      }
    } catch (err) {
      // TwoFactorRequiredError 需要向上抛出，由调用方处理跳转
      if (err instanceof TwoFactorRequiredError) {
        throw err;
      }
      console.error('登录错误:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        console.warn('登出请求失败:', res.status);
        message.error(t('auth.logoutFailed'));
      } else {
        message.info(t('common.info'));
      }
      setUser(null);
      setSudoModeExpiresAt(null);
    } catch (err) {
      console.error('登出错误:', err);
      message.error(t('auth.logoutFailed'));
      setUser(null);
      setSudoModeExpiresAt(null);
    }
  }, [t]);

  const enterSudoMode = useCallback(async (password: string) => {
    const res = await fetch('/api/auth/sudo-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = data.error ?? t('auth.sudoModeEnterFailed');
      message.error(error);
      throw new Error(error);
    }
    setSudoModeExpiresAt(Date.now() + SUDO_MODE_TTL_MS);
    setUser((prev) => (prev ? { ...prev, sudoModeActive: true } : prev));
    message.success(t('auth.sudoModeActive'));
  }, [t]);

  const exitSudoMode = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sudo-mode', { method: 'DELETE' });
      if (!res.ok) {
        message.error(t('auth.sudoModeExitFailed'));
        return;
      }
      setSudoModeExpiresAt(null);
      setUser((prev) => (prev ? { ...prev, sudoModeActive: false } : prev));
      message.info(t('auth.sudoModeExited'));
    } catch {
      message.error(t('auth.sudoModeExitFailed'));
    }
  }, [t]);

  // sudo 模式到期自动退出并刷新状态
  useEffect(() => {
    if (sudoModeExpiresAt === null) return;
    const remaining = sudoModeExpiresAt - Date.now();
    if (remaining <= 0) {
      setSudoModeExpiresAt(null);
      setUser((prev) => (prev ? { ...prev, sudoModeActive: false } : prev));
      return;
    }
    const timer = setTimeout(() => {
      setSudoModeExpiresAt(null);
      setUser((prev) => (prev ? { ...prev, sudoModeActive: false } : prev));
      void refresh();
    }, remaining);
    return () => clearTimeout(timer);
  }, [sudoModeExpiresAt, refresh]);

  const isRoot = (user?.role === 'root' || user?.sudoModeActive === true) ?? false;

  const contextValue = useMemo(() => ({
    user,
    loading,
    userRole: user?.role ?? null,
    isRoot,
    sudoModeActive: user?.sudoModeActive ?? false,
    sudoModeExpiresAt,
    login,
    logout,
    refresh,
    enterSudoMode,
    exitSudoMode,
  }), [user, loading, isRoot, sudoModeExpiresAt, login, logout, refresh, enterSudoMode, exitSudoMode]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(getTranslate('auth.useAuthOutsideProvider'));
  }
  return context;
};
