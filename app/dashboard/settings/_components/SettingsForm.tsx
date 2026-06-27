'use client';

import { Form, Input } from 'antd';
import { AtSign, Image as ImageIcon, Save, User } from 'lucide-react';
import type { FormInstance } from 'antd/es/form/Form';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';
import { SettingsFormField } from './SettingsFormField';
import type { SettingsFormValues } from '../_lib/types';

const inputClassName =
  '!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900';

interface SettingsFormProps {
  form: FormInstance<SettingsFormValues>;
  loading: boolean;
  onSubmit: (values: SettingsFormValues) => Promise<void>;
}

/**
 * 设置页表单：头像 URL、用户名、昵称、提交按钮。
 * 提交后由 useSettingsSave 统一处理保存与 GitHub 头像同步。
 */
export function SettingsForm({ form, loading, onSubmit }: SettingsFormProps) {
  const { t } = useI18n();

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={{ avatarUrl: '', username: '', displayName: '' }}
      requiredMark={false}
      className="w-full max-w-md mx-auto"
    >
      <SettingsFormField
        name="avatarUrl"
        label={t('settings.avatarUrl')}
        icon={<ImageIcon size={12} className="text-zinc-500" />}
        placeholder={t('settings.avatarUrlPlaceholder')}
        extra={t('settings.avatarUrlHint')}
      >
        <Input
          placeholder={t('settings.avatarUrlPlaceholder')}
          className={inputClassName}
          allowClear
        />
      </SettingsFormField>

      <SettingsFormField
        name="username"
        label={t('settings.username')}
        icon={<AtSign size={12} className="text-zinc-500" />}
        placeholder={t('settings.usernamePlaceholder')}
        rules={[
          { required: true, message: t('validation.required') },
          { min: 3, max: 20, message: t('validation.usernameFormat') },
          { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat') },
        ]}
      >
        <Input
          placeholder={t('settings.usernamePlaceholder')}
          className={inputClassName}
        />
      </SettingsFormField>

      <SettingsFormField
        name="displayName"
        label={t('settings.displayName')}
        icon={<User size={12} className="text-zinc-500" />}
        placeholder={t('settings.displayNamePlaceholder')}
        extra={t('settings.displayNameHint')}
      >
        <Input
          placeholder={t('settings.displayNamePlaceholder')}
          className={inputClassName}
        />
      </SettingsFormField>

      <Form.Item className="mb-0 pt-2">
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          icon={!loading && <Save size={14} />}
          block
          rounded="sm"
          className="!h-10 !text-sm !font-semibold !border-0 shadow-sm transition-all"
        >
          {t('common.save')}
        </Button>
      </Form.Item>
    </Form>
  );
}
