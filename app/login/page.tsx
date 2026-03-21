'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, message, Card, Typography, Form, Divider } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Flexbox, Text } from '@lobehub/ui';
import Link from 'next/link';
import { motion } from 'motion/react';

const { Title } = Typography;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-6"
    >
      <Flexbox width={'min(100%, 440px)'} gap={16}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />} type="text">返回首页</Button>
          </Link>
        </div>

        <Card 
          variant="borderless" 
          style={{ 
            borderRadius: 16, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            background: 'white'
          }}
        >
          <Flexbox gap={16} style={{ marginBottom: 32 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>欢迎回来</Title>
            <Text type="secondary">登录以管理您的 Private Journal</Text>
          </Flexbox>

          <Form name="login" layout="vertical" onFinish={handleLogin} autoComplete="off">
            <Form.Item 
              name="username" 
              rules={[{ required: true, message: '请输入用户名' }]}
              style={{ marginBottom: 16 }}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
                size="large"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Item>
            <Form.Item 
              name="password" 
              rules={[{ required: true, message: '请输入密码' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
                size="large"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block 
                size="large"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0 16px' }} />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">还没有账号？</Text>
            <Link href="/register">
              <Button type="link" style={{ padding: '0 4px' }}>立即注册</Button>
            </Link>
          </div>
        </Card>
      </Flexbox>
    </motion.div>
  );
}
