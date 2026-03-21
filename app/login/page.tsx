'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import { User, Lock } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import AuthCard from '@/components/AuthCard';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const [form] = Form.useForm();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      router.push('/dashboard');
    } catch (error: any) {
      // Error handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <Flexbox gap={8}>
      <Text type="secondary">还没有账号？</Text>
      <Link href="/register">
        <Button type="link" style={{ padding: '0 4px' }}>立即注册</Button>
      </Link>
    </Flexbox>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-6"
    >
      <Flexbox gap={16}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />} type="text">
              返回首页
            </Button>
          </Link>
        </div>

        <AuthCard
          footer={footer}
          subtitle="登录以管理您的 Originium Kernel"
          title="欢迎回来"
        >
          <Form form={form} layout="vertical" onFinish={handleLogin} autoComplete="off">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="用户名"
                size="large"
                prefix={
                  <Icon
                    icon={User}
                    style={{ marginInline: 6 }}
                  />
                }
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
              style={{ marginBottom: 0 }}
            >
              <Input.Password
                placeholder="密码"
                size="large"
                prefix={
                  <Icon
                    icon={Lock}
                    style={{ marginInline: 6 }}
                  />
                }
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Button block htmlType="submit" loading={loading} size="large" type="primary">
                登录
              </Button>
            </Form.Item>
          </Form>
        </AuthCard>

        <Flexbox padding={24}>
          <Text align="center" type="secondary">
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </Flexbox>
      </Flexbox>
    </motion.div>
  );
}
