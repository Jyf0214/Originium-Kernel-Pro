'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Form, notification, message } from 'antd';
import { ChevronRight, User, Lock, Mail } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

/**
 * Register Page Component
 * 
 * 参考LobeChat设计语言的注册页面
 * 优化标题视觉权重、输入框样式、阴影和间距
 * 
 * @see https://github.com/lobehub/lobe-chat - UI设计参考
 * @copyright LobeChat UI Design
 */
export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    console.log('[注册页面] 提交注册数据:', {
      email: values.email,
      name: values.name,
      password: '***REDACTED***'
    });
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.name
        })
      });
      const data = await res.json();
      console.log('[注册页面] 服务器响应:', data);

      if (res.ok && data.success) {
        const roleMsg = data.user?.role === 'sudo' 
          ? '您是首个注册用户，已获得管理员权限！' 
          : '账号已创建，请前往登录';
          
        notification.success({
          message: '注册成功',
          description: roleMsg,
          placement: 'topRight',
          duration: 5,
        });
        router.push('/login');
      } else {
        throw new Error(data.error || data.message || '注册失败');
      }
    } catch (err: unknown) {
      console.error('[注册页面] 注册失败:', err);
      message.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <Text>
      已有账号？{' '}
      <Link href="/login" style={{ fontWeight: 500, textDecoration: 'underline' }}>
        立即登录
      </Link>
    </Text>
  );

  return (
    <AuthLayout>
      <AuthCard
        footer={footer}
        subtitle="加入 Originium Kernel"
        title="创建账号"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入电子邮箱' },
              { type: 'email', message: '请输入有效的电子邮箱地址' }
            ]}
          >
            <Input
              placeholder="your@email.com"
              size="large"
              prefix={
                <Icon icon={Mail} style={{ marginInline: 6 }} />
              }
              style={{ 
                padding: 6,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, message: '昵称至少 2 个字符' }
            ]}
          >
            <Input
              placeholder="您的昵称"
              size="large"
              prefix={
                <Icon icon={User} style={{ marginInline: 6 }} />
              }
              style={{ 
                padding: 6,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 个字符' }
            ]}
          >
            <Input.Password
              placeholder="至少 6 个字符"
              size="large"
              prefix={
                <Icon icon={Lock} style={{ marginInline: 6 }} />
              }
              style={{ 
                padding: 6,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认您的密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="再次输入密码"
              size="large"
              prefix={
                <Icon icon={Lock} style={{ marginInline: 6 }} />
              }
              style={{ 
                padding: 6,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button 
              block 
              htmlType="submit" 
              loading={loading} 
              size="large" 
              type="primary"
              style={{ borderRadius: 12, height: 48 }}
            >
              立即注册
            </Button>
          </Form.Item>
        </Form>
        
        <Text fontSize={13} type={'secondary'} style={{ textAlign: 'center', marginTop: 16 }}>
          注册即表示您同意我们的{' '}
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
            服务条款
          </Link>
          {' '}和{' '}
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
            隐私政策
          </Link>
        </Text>
      </AuthCard>
    </AuthLayout>
  );
}
