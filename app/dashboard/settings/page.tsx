'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Input, Form, message, Avatar } from 'antd';
import { User, AtSign, Image, Save } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import AuthCard from '@/components/AuthCard';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        avatarUrl: user.avatar || '',
        username: user.name || '',
        displayName: user.displayName || user.name || '',
      });
    }
  }, [user, form]);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: values.avatarUrl || undefined,
          username: values.username,
          name: values.displayName || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        message.success(t('settings.saveSuccess'));
        await refresh();
      } else {
        message.error(data.error || t('settings.saveFailed'));
      }
    } catch (error: any) {
      message.error(error.message || t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = Form.useWatch('avatarUrl', form);

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 600,
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 100px)',
    }}>
      <AuthCard
        subtitle={t('settings.subtitle')}
        title={t('settings.title')}
      >
        <Flexbox align="center" style={{ marginBottom: 32 }}>
          <Avatar
            size={80}
            src={avatarUrl || undefined}
            icon={!avatarUrl && <Icon icon={User} />}
            style={{
              backgroundColor: 'var(--ant-color-primary)',
              fontSize: 32,
            }}
          />
        </Flexbox>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            avatarUrl: '',
            username: '',
            displayName: '',
          }}
        >
          <Form.Item
            name="avatarUrl"
            label={
              <Flexbox horizontal gap={8} align="center">
                <Icon icon={Image} style={{ fontSize: 16 }} />
                <Text>{t('settings.avatarUrl')}</Text>
              </Flexbox>
            }
            extra={t('settings.avatarUrlHint')}
          >
            <Input
              placeholder={t('settings.avatarUrlPlaceholder')}
              size="large"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="username"
            label={
              <Flexbox horizontal gap={8} align="center">
                <Icon icon={AtSign} style={{ fontSize: 16 }} />
                <Text>{t('settings.username')}</Text>
              </Flexbox>
            }
            rules={[
              { required: true, message: t('validation.required') },
              { min: 3, max: 20, message: t('validation.usernameFormat') },
              { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat') },
            ]}
          >
            <Input
              placeholder={t('settings.usernamePlaceholder')}
              size="large"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={
              <Flexbox horizontal gap={8} align="center">
                <Icon icon={User} style={{ fontSize: 16 }} />
                <Text>{t('settings.displayName')}</Text>
              </Flexbox>
            }
            extra={t('settings.displayNameHint')}
          >
            <Input
              placeholder={t('settings.displayNamePlaceholder')}
              size="large"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              icon={<Icon icon={Save} />}
              block
              style={{
                height: 56,
                fontSize: 16,
                borderRadius: 12,
              }}
            >
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </AuthCard>
    </div>
  );
}
