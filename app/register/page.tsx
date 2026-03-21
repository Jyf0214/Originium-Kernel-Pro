'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, message, Card, Typography, Form, Divider, notification } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Flexbox, Text } from '@lobehub/ui';
import Link from 'next/link';
import { motion } from 'motion/react';

const { Title } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          name: values.name
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        notification.success({
          message: '注册成功',
          description: '账号已创建，请前往登录',
          placement: 'topRight',
        });
        router.push('/login');
      } else {
        throw new Error(data.message || '注册失败');
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '注册失败');
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
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>创建账号</Title>
            <Text type="secondary">加入 Private Journal</Text>
          </Flexbox>

          <Form 
            form={form}
            name="register" 
            layout="vertical" 
            onFinish={onFinish} 
            autoComplete="off"
          >
            <Form.Item 
              name="username" 
              rules={[
                { required: true, message: '请输入用户名' }, 
                { min: 3, message: '用户名至少 3 个字符' }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
            </Form.Item>
            <Form.Item 
              name="name" 
              rules={[{ required: true, message: '请输入昵称' }]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<UserOutlined />} placeholder="昵称" size="large" />
            </Form.Item>
            <Form.Item 
              name="password" 
              rules={[
                { required: true, message: '请输入密码' }, 
                { min: 6, message: '密码至少 6 个字符' }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
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
              style={{ marginBottom: 24 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block 
                size="large"
              >
                立即注册
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0 16px' }} />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">已有账号？</Text>
            <Link href="/login">
              <Button type="link" style={{ padding: '0 4px' }}>立即登录</Button>
            </Link>
          </div>
        </Card>
      </Flexbox>
    </motion.div>
  );
}
