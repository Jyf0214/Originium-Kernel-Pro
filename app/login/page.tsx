'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, message, Card, Typography, Form } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { motion } from 'motion/react';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      return message.warning('请填写用户名和密码');
    }

    setLoading(true);
    try {
      await login(username, password);
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
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
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
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>欢迎回来</Title>
            <Text type="secondary">登录以管理您的 Private Journal</Text>
          </div>

          <Form name="login" layout="vertical" onFinish={handleLogin} autoComplete="off">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
                size="large"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
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
                style={{ 
                  background: '#000', 
                  borderColor: '#000', 
                  height: 48,
                  borderRadius: 8 
                }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">还没有账号？</Text>
            <Link href="/register">
              <Button type="link" style={{ padding: '0 4px' }}>立即注册</Button>
            </Link>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
