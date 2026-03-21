'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, message, Card } from 'antd';
import { UserAddOutlined, GoogleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

/**
 * Get client IP (simplified - in production use server-side)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get User Agent
 */
function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
}

/**
 * Check registration limit (Placeholder)
 */
async function checkRegistrationLimit(): Promise<{ allowed: boolean; count?: number; limit?: number }> {
  // TODO: 实现基于 API 的注册限制检查
  return { allowed: true };
}

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      message.error('密码长度至少为 6 位');
      return;
    }

    // Check registration limit
    const limitCheck = await checkRegistrationLimit();
    if (!limitCheck.allowed) {
      message.error(`注册人数已达上限 (${limitCheck.count}/${limitCheck.limit})`);
      return;
    }

    setLoading(true);

    try {
      // TODO: 实现注册 API 调用
      // const ip = await getClientIP();
      // const userAgent = getUserAgent();
      
      message.info('注册功能正在维护中，请联系管理员');
      // router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error);
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      // TODO: 实现 Google OAuth 注册 API
      message.info('Google 注册正在维护中');
    } catch (error: any) {
      console.error('Google sign up failed:', error);
      message.error('Google 注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-zinc-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserAddOutlined className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">创建账号</h1>
          <p className="text-zinc-500 mt-2">加入 Originium Kernel，开始写作</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            size="large"
            placeholder="昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefix={<UserAddOutlined className="text-zinc-400" />}
            required
          />

          <Input
            size="large"
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefix={<MailOutlined className="text-zinc-400" />}
            required
          />

          <Input.Password
            size="large"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            prefix={<LockOutlined className="text-zinc-400" />}
            required
          />

          <Input.Password
            size="large"
            placeholder="确认密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            prefix={<LockOutlined className="text-zinc-400" />}
            required
          />

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            className="w-full bg-zinc-900 border-zinc-900 hover:bg-zinc-800"
          >
            注册账号
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-zinc-200" />
          <span className="px-4 text-sm text-zinc-400">或</span>
          <div className="flex-1 border-t border-zinc-200" />
        </div>

        <Button
          size="large"
          className="w-full"
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignUp}
          loading={loading}
        >
          使用 Google 账号注册
        </Button>

        <p className="text-center text-sm text-zinc-500 mt-6">
          已有账号？{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            立即登录
          </a>
        </p>
      </Card>
    </div>
  );
}
