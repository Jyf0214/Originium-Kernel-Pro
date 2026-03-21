'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/FirebaseProvider';
import { auth } from '@/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Button, Input, message, Card } from 'antd';
import { LoginOutlined, GoogleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      message.success('登录成功！');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.code === 'auth/user-not-found') {
        message.error('该邮箱未注册');
      } else if (error.code === 'auth/wrong-password') {
        message.error('密码错误');
      } else if (error.code === 'auth/invalid-email') {
        message.error('无效的邮箱地址');
      } else if (error.code === 'auth/too-many-requests') {
        message.error('尝试次数过多，请稍后重试');
      } else {
        message.error('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      message.success('登录成功！');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google sign in failed:', error);
      message.error('Google 登录失败，请稍后重试');
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LoginOutlined className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">欢迎回来</h1>
          <p className="text-zinc-500 mt-2">登录到 Originium Kernel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            className="w-full"
          >
            登录
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
          onClick={handleGoogleSignIn}
          loading={loading}
        >
          使用 Google 账号登录
        </Button>

        <p className="text-center text-sm text-zinc-500 mt-6">
          没有账号？{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            立即注册
          </a>
        </p>
      </Card>
    </div>
  );
}
