'use client';

import { useState, useEffect, createContext, useContext } from 'react';

// 用户身份定义
export type UserRole = 'wid' | 'sudo';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  userGroup?: string;
  wid?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  userProfile: User | null;
  userWid: string | null;
  isSudo: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化检查登录状态 (占位实现)
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      // TODO: 实现基于 Cookie 的实际验证
      // 模拟已登录用户进行测试 (如果需要)
      // setUser({
      //   uid: 'test-uid',
      //   email: 'admin@example.com',
      //   displayName: 'Admin',
      //   role: 'sudo',
      //   wid: 'WID-ADMIN'
      // });
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    // TODO: 实现注册/登录 API 调用
    console.log('Login attempt:', email);
    // 模拟登录成功
    setUser({
      uid: 'mock-uid',
      email: email,
      displayName: email.split('@')[0],
      role: 'sudo', // 默认赋予 sudo 权限以便测试
      wid: 'WID-MOCK'
    });
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRole: user?.role || null,
      userProfile: user,
      userWid: user?.wid || null,
      isSudo: user?.role === 'sudo',
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
