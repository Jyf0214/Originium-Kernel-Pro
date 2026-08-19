'use client';

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Form, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';
import { useI18n } from '@/hooks/use-i18n';

/**
 * 清洗 callbackUrl — 仅允许相对路径，防止开放重定向
 */
function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return '/dashboard';
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('://')) {
    return '/dashboard';
  }
  return url;
}

/**
 * 2FA 验证页面 — 在密码验证通过后要求输入 TOTP 验证码
 */
function TwoFactorForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const inputRef = useRef<React.ComponentRef<typeof Input>>(null);
  const { t } = useI18n();

  const callbackUrl = sanitizeCallbackUrl(searchParams?.get('callbackUrl') ?? null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = useCallback(async (values: { code: string }) => {
    setLoading(true);
    try {
      // tempToken 通过 httpOnly cookie 自动携带，无需在 body 中传递
      const res = await fetch('/api/auth/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        message.success(t('auth.verifySuccess'));
        router.push(callbackUrl);
      } else {
        message.error(data.error ?? t('auth.verifyFailed'));
      }
    } catch {
      message.error(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }, [callbackUrl, router, t]);

  const inputStyle = {
    padding: '12px 16px',
    height: 48,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 8,
  };

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <div className="flex flex-col items-center gap-4 mt-4">
            <Button
              icon={<ChevronRight size={14} className="rotate-180" />}
              size="lg"
              autoLoading={false}
              onClick={() => router.replace('/login')}
            >
              {t('auth.backToLogin')}
            </Button>
          </div>
        }
        subtitle={t('auth.verifierCodeHint')}
        title={t('auth.twoFactorAuth')}
      >
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={24} className="text-zinc-500" />
          <span className="text-sm text-zinc-500">
            {t('auth.authenticatorHint')}
          </span>
        </div>

        <Form form={form} layout="vertical" onFinish={handleVerify}>
          <Form.Item
            name="code"
            style={{ marginBottom: 12 }}
            rules={[
              { required: true, message: t('auth.inputVerificationCode') },
              { len: 6, message: t('auth.codeMustBe6Digits') },
              { pattern: /^\d{6}$/, message: t('auth.codeMustBe6Digits') },
            ]}
          >
            <Input
              placeholder="000000"
              ref={inputRef}
              size="large"
              maxLength={6}
              style={{
                ...inputStyle,
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: '0.5em',
                fontFamily: 'monospace',
              }}
              suffix={
                <Button
                  icon={<ChevronRight size={14} />}
                  loading={loading}
                  title={t('auth.verify')}
                  variant="filled"
                  onClick={() => form.submit()}
                />
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
            {t('auth.verify')}
          </Button>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}

export default function TwoFactorLoginPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<GlobalLoading tip={t('common.loading')} />}>
      <TwoFactorForm />
    </Suspense>
  );
}
