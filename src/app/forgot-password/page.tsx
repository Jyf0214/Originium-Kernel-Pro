'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Form, message } from 'antd';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showError } from '@/lib/error';
import { ChevronRight, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [form] = Form.useForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => { inputRef.current?.focus(); }, []);

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
        showError(data.error ?? t('auth.resetLinkFailed'));
      }
  } catch {
    showError(t('auth.resetLinkFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthLayout>
        <AuthCard
          footer={
            <div className="flex flex-col items-center gap-4 py-6">
              <Button variant="primary" size="lg" block autoLoading={false} onClick={() => { setEmailSent(false); form.resetFields(); inputRef.current?.focus(); }}>
                {t('auth.resendEmail')}
              </Button>
              <Link href="/login">
                <Button icon={<ArrowLeft size={14} />} size="lg" autoLoading={false}>
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </div>
          }
          subtitle={t('auth.checkEmail')}
          title={t('auth.emailSent')}
        >
          <div className="flex items-center gap-4 p-6 rounded-xl" style={{ background: 'var(--ant-color-success-bg)', border: '1px solid var(--ant-color-success-border)' }}>
            <CheckCircle size={32} style={{ color: 'var(--ant-color-success)' }} />
            <div>
              <span className="text-base block mb-1">{t('auth.resetLinkSent')}</span>
              <span className="text-sm text-zinc-400">{sentEmail}</span>
            </div>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <div className="flex flex-col items-center gap-4 py-6">
            <Link href="/login">
              <Button icon={<ArrowLeft size={14} />} size="lg" autoLoading={false}>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        }
        subtitle={t('auth.forgotPasswordSubtitle')}
        title={t('auth.forgotPasswordTitle')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" style={{ marginBottom: 12 }} rules={[
            { required: true, message: t('validation.required') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}>
            <Input
              placeholder={t('auth.inputEmailPlaceholder')}
              ref={inputRef}
              size="xl"
              className="text-base"
              prefix={<Mail size={16} className="text-zinc-400" />}
              suffix={
                <Button icon={<ChevronRight size={14} />} loading={loading} disabled={loading} title={t('auth.sendResetLink')} variant="filled" onClick={() => form.submit()} />
              }
            />
          </Form.Item>
          <Button
            variant="primary"
            size="lg"
            block
            type="submit"
            loading={loading}
            autoLoading={false}
          >
            {t('auth.sendResetLink')}
          </Button>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
