'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form } from 'antd';
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
    <Flexbox gap={8} horizontal justify="center">
      <Text type="secondary">还没有账号？</Text>
      <Link href="/register">
        <Button type="link" className="font-medium" style={{ padding: '0 4px' }}>立即注册</Button>
      </Link>
    </Flexbox>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-[#f5f7fa] to-[#e8ecef] flex items-center justify-center p-6"
    >
      <Flexbox gap={24}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/">
            <Button 
              icon={<ArrowLeftOutlined />} 
              type="text"
              className="text-zinc-600 hover:text-zinc-900"
            >
              返回首页
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
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
                  className="rounded-xl"
                  prefix={
                    <Icon
                      icon={User}
                      size={{ size: 18 }}
                      style={{ marginInline: 4 }}
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
                  className="rounded-xl"
                  prefix={
                    <Icon
                      icon={Lock}
                      size={{ size: 18 }}
                      style={{ marginInline: 4 }}
                    />
                  }
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button 
                  block 
                  htmlType="submit" 
                  loading={loading} 
                  size="large" 
                  type="primary"
                  className="rounded-xl font-medium"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </AuthCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6"
        >
          <Text align="center" type="secondary" style={{ fontSize: 13 }}>
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </motion.div>
      </Flexbox>
    </motion.div>
  );
}
