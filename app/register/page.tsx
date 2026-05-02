'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, notification, message, Select, Spin } from 'antd';
import { User, Lock, Mail, UserX } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

interface UserGroup {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    // 检查是否允许注册
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setRegistrationOpen(data.auth?.allowRegistration !== false);
      })
      .catch(() => {
        setRegistrationOpen(true); // 获取失败时默认允许
      });

    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/user-groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.filter((g: UserGroup) => g.id !== 'sudo' && g.id !== 'admin'));
        }
      } catch (error) {
        console.error('获取用户组失败:', error);
      }
    };
    fetchGroups();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (values.password !== values.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          username: values.username,
          password: values.password,
          name: values.name || values.email.split('@')[0],
          userGroup: values.userGroup || 'default',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const roleMsg = data.user?.role === 'sudo' ? '您是首个注册用户，已获得管理员权限！' : '账号已创建，请前往登录';
        notification.success({ message: '注册成功', description: roleMsg, placement: 'topRight', duration: 5 });
        router.push('/login');
      } else if (data.errorKey === 'registration_closed') {
        setRegistrationOpen(false);
      } else {
        throw new Error(data.error || data.message || '注册失败');
      }
    } catch (err: any) {
      console.error('注册失败:', err);
      message.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  // 正在加载配置
  if (registrationOpen === null) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      </AuthLayout>
    );
  }

  // 注册已关闭
  if (!registrationOpen) {
    return (
      <AuthLayout>
        <AuthCard
          footer={
            <div className="flex items-center justify-center gap-2 py-6">
              <span className="text-sm text-zinc-400">已有账号？</span>
              <Link href="/login">
                <span className="text-sm font-medium text-zinc-900">立即登录</span>
              </Link>
            </div>
          }
          subtitle="管理员已关闭新用户注册"
          title="注册已关闭"
        >
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
              <UserX size={28} className="text-zinc-400" />
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              当前站点不接受新用户注册。如有疑问，请联系管理员。
            </p>
            <Link href="/login">
              <Button type="primary" size="large" className="bg-zinc-900 rounded-xl h-12 px-8">
                返回登录
              </Button>
            </Link>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // 注册开放
  return (
    <AuthLayout>
      <AuthCard
        footer={
          <div className="flex items-center justify-center gap-2 py-6">
            <span className="text-sm text-zinc-400">已有账号？</span>
            <Link href="/login">
              <span className="text-sm font-medium text-zinc-900">立即登录</span>
            </Link>
          </div>
        }
        subtitle="加入 Originium Kernel"
        title="创建账号"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" style={{ marginBottom: 16 }} rules={[
            { required: true, message: '请输入电子邮箱' },
            { type: 'email', message: '请输入有效的电子邮箱地址' },
          ]}>
            <Input placeholder="your@email.com" size="large" prefix={<Mail size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="username" style={{ marginBottom: 16 }} rules={[
            { required: true, message: '请输入用户名' },
            { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含字母、数字和下划线，3-20个字符' },
          ]}>
            <Input placeholder="用户名（用于登录）" size="large" prefix={<User size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="name" style={{ marginBottom: 16 }} rules={[
            { required: true, message: '请输入昵称' },
            { min: 2, message: '昵称至少 2 个字符' },
          ]}>
            <Input placeholder="您的昵称" size="large" prefix={<User size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="password" style={{ marginBottom: 16 }} rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少 6 个字符' },
          ]}>
            <Input.Password placeholder="至少 6 个字符" size="large" prefix={<Lock size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          {groups.length > 0 && (
            <Form.Item name="userGroup" style={{ marginBottom: 16 }} initialValue="default">
              <Select size="large" placeholder="选择用户组" style={{ height: 56 }} options={groups.map(g => ({ label: g.name, value: g.id }))} />
            </Form.Item>
          )}
          <Form.Item name="confirmPassword" style={{ marginBottom: 0 }} dependencies={['password']} rules={[
            { required: true, message: '请确认您的密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}>
            <Input.Password placeholder="再次输入密码" size="large" prefix={<Lock size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button block htmlType="submit" loading={loading} size="large" type="primary" style={{ height: 48, borderRadius: 8, fontSize: 16 }}>
              立即注册
            </Button>
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
