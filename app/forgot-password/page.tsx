'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input, Form, message } from 'antd';
import { ChevronRight, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [form] = Form.useForm();
  const inputRef = useRef<any>(null);
  const { t } = useI18n();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (values: { email: string }) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setSentEmail(values.email);
        setEmailSent(true);
        message.success(t('auth.resetLinkSent'));
      } else {
        message.error(data.error || t('auth.resetLinkFailed'));
      }
    } catch (error) {
      message.error(t('auth.resetLinkFailed'));
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

  if (emailSent) {
    return (
      <AuthLayout>
        <AuthCard
          footer={
            <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
              <Link href="/login">
                <Button icon={<Icon icon={ArrowLeft} />} size="large">
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </Flexbox>
          }
          subtitle={t('auth.checkEmail')}
          title={t('auth.emailSent')}
        >
          <Flexbox align="center" gap={16} padding={24} style={{
            background: 'var(--ant-color-success-bg)',
            borderRadius: 12,
            border: '1px solid var(--ant-color-success-border)'
          }}>
            <Icon icon={CheckCircle} size={32} style={{ color: 'var(--ant-color-success)' }} />
            <Flexbox>
              <Text style={{ fontSize: 16, marginBottom: 4 }}>{t('auth.resetLinkSent')}</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>{sentEmail}</Text>
            </Flexbox>
          </Flexbox>
          <Button
            size="large"
            block
            style={{ marginTop: 24 }}
            onClick={() => { setEmailSent(false); form.resetFields(); inputRef.current?.focus(); }}
          >
            {t('auth.resendEmail')}
          </Button>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
            <Link href="/login">
              <Button icon={<Icon icon={ArrowLeft} />} size="large">
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </Flexbox>
        }
        subtitle={t('auth.forgotPasswordSubtitle')}
        title={t('auth.forgotPasswordTitle')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="email"
            style={{ marginBottom: 0 }}
            rules={[
              { required: true, message: t('validation.required') },
              { type: 'email', message: t('validation.emailInvalid') }
            ]}
          >
            <Input
              placeholder={t('auth.inputEmailPlaceholder')}
              ref={inputRef}
              size="large"
              prefix={<Icon icon={Mail} style={{ marginInline: 8 }} />}
              style={inputStyle}
              suffix={
                <Button
                  icon={<Icon icon={ChevronRight} />}
                  loading={loading}
                  disabled={loading}
                  title={t('auth.sendResetLink')}
                  variant="filled"
                  onClick={() => form.submit()}
                />
              }
            />
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
