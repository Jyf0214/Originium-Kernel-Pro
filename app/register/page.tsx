'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/FirebaseProvider';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
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
 * Check registration limit
 */
async function checkRegistrationLimit(): Promise<{ allowed: boolean; count?: number; limit?: number }> {
  try {
    const configRef = doc(db, 'config', 'registration');
    const configDoc = await getDoc(configRef);
    
    if (configDoc.exists()) {
      const config = configDoc.data();
      const count = config.userCount || 0;
      const limit = config.maxUsers || Infinity;
      
      if (count >= limit) {
        return { allowed: false, count, limit };
      }
    }
    
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useFirebase();
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
      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      if (name) {
        await updateProfile(user, { displayName: name });
      }

      // Get registration info
      const ip = await getClientIP();
      const userAgent = getUserAgent();

      // Create user profile (wid = normal user / Boss)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        wid: `WID-${user.uid.slice(-8).toUpperCase()}`,
        email: user.email,
        name: name || user.email?.split('@')[0] || 'Anonymous',
        role: 'wid',  // Boss (普通用户)
        photoURL: user.photoURL || '',
        status: 'active',
        registrationInfo: {
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update user count
      const configRef = doc(db, 'config', 'registration');
      await setDoc(configRef, {
        userCount: increment(1),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      message.success('注册成功！');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        message.error('该邮箱已被注册');
      } else if (error.code === 'auth/invalid-email') {
        message.error('无效的邮箱地址');
      } else if (error.code === 'auth/weak-password') {
        message.error('密码强度不足');
      } else if (error.code === 'auth/operation-not-allowed') {
        message.error('注册功能未启用');
      } else {
        message.error('注册失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Get registration info
        const ip = await getClientIP();
        const userAgent = getUserAgent();

        // Create profile for new user
        await setDoc(userDocRef, {
          uid: user.uid,
          wid: `WID-${user.uid.slice(-8).toUpperCase()}`,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          role: 'wid',  // Boss (普通用户)
          photoURL: user.photoURL || '',
          status: 'active',
          registrationInfo: {
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Update user count
        const configRef = doc(db, 'config', 'registration');
        await setDoc(configRef, {
          userCount: increment(1),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      message.success('登录成功！');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google sign up failed:', error);
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
            className="w-full"
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
