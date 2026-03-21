'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Form, notification, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import { User, Lock } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import AuthCard from '@/components/AuthCard';

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

  const footer = (
    <Flexbox gap={8}>
      <Text type="secondary">已有账号？</Text>
      <Link href="/login">
        <Button type="link" style={{ padding: '0 4px' }}>立即登录</Button>
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
          subtitle="加入 Originium Kernel"
          title="创建账号"
        >
          <Form 
            form={form}
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
              name="name"
              rules={[{ required: true, message: '请输入昵称' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="昵称"
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
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 个字符' }
              ]}
              style={{ marginBottom: 16 }}
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
              style={{ marginBottom: 0 }}
            >
              <Input.Password
                placeholder="确认密码"
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
                立即注册
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
