'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form, message } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const inputRef = useRef<any>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleCheckUser = async (values: { email: string }) => {
    setLoading(true);
    try {
      setEmail(values.email);
      setStep('password');
    } catch (error: any) {
      message.error(error.message || '验证用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      await login(email, values.password);
      message.success('登录成功');
      router.push(callbackUrl);
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
  };

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  const renderEmailStep = () => (
    <AuthCard
      footer={
        <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
          <Text type="secondary" style={{ fontSize: 14, lineHeight: '22px' }}>
            还没有账号？
          </Text>
          <Link href="/register">
            <Text style={{ fontSize: 14, fontWeight: 500, lineHeight: '22px' }}>
              立即注册
            </Text>
          </Link>
        </Flexbox>
      }
      subtitle={`登录以管理您的 Originium Kernel`}
      title="欢迎回来"
    >
      <Form form={form} layout="vertical" onFinish={handleCheckUser}>
        <Form.Item
          name="email"
          style={{ marginBottom: 0 }}
          rules={[
            { required: true, message: '请输入邮箱或用户名' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            placeholder="请输入邮箱"
            ref={inputRef}
            size="large"
            prefix={<Icon icon={Mail} style={{ marginInline: 8 }} />}
            style={inputStyle}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                title="下一步"
                variant={'filled'}
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
    </AuthCard>
  );

  const renderPasswordStep = () => (
    <AuthCard
      footer={
        <Button
          icon={<Icon icon={ChevronRight} style={{ transform: 'rotate(180deg)' }} />}
          size={'large'}
          style={{ marginTop: 20 }}
          onClick={handleBackToEmail}
        >
          返回上一步
        </Button>
      }
      subtitle="输入密码完成登录"
      title="欢迎回来"
    >
      <Text fontSize={18} style={{ lineHeight: '28px' }}>{email}</Text>
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        onFinish={handleLogin}
      >
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
          style={{ marginBottom: 0 }}
        >
          <Input.Password
            placeholder="请输入密码"
            ref={inputRef}
            size="large"
            prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
            style={inputStyle}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                style={{ color: 'var(--ant-color-primary)' }}
                title="登录"
                variant={'filled'}
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
    </AuthCard>
  );

  return (
    <AuthLayout>
      {step === 'email' ? renderEmailStep() : renderPasswordStep()}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
