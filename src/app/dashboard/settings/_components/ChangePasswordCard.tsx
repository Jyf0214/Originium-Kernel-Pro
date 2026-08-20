'use client';

import { useState } from 'react';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProCard } from '@/components/ui/ProCard';
import { useI18n } from '@/hooks/use-i18n';
import { message } from 'antd';

/**
 * 修改密码卡片
 *
 * 调用 /api/auth/change-password 校验当前密码并更新新密码。
 * 成功后服务端会递增会话版本并刷新当前会话 cookie，其他设备/API 密钥随之失效。
 */
export function ChangePasswordCard() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (loading) return;
    if (!currentPassword || !newPassword) {
      message.warning(t('settings.changePassword.fillAll'));
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning(t('settings.changePassword.mismatch'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success(t('settings.changePassword.success'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error ?? t('settings.changePassword.failed'));
      }
    } catch {
      setError(t('settings.changePassword.networkFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      <Input
        password
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
      />
    </div>
  );

  return (
    <ProCard className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
          <KeyRound size={16} className="text-zinc-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{t('settings.changePassword.title')}</h3>
          <p className="text-xs text-zinc-400">{t('settings.changePassword.desc')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 break-all">{error}</p>
        </div>
      )}

      <div className="space-y-4 max-w-md">
        {renderPasswordField({
          label: t('settings.changePassword.currentLabel'),
          value: currentPassword,
          onChange: setCurrentPassword,
          placeholder: t('settings.changePassword.currentPlaceholder'),
        })}
        {renderPasswordField({
          label: t('settings.changePassword.newLabel'),
          value: newPassword,
          onChange: setNewPassword,
          placeholder: t('settings.changePassword.newPlaceholder'),
        })}
        {renderPasswordField({
          label: t('settings.changePassword.confirmLabel'),
          value: confirmPassword,
          onChange: setConfirmPassword,
          placeholder: t('settings.changePassword.confirmPlaceholder'),
        })}
      </div>

      <div className="mt-4">
        <Button
          variant="primary"
          size="sm"
          autoLoading={false}
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" />{t('settings.changePassword.saving')}</>
            : t('settings.changePassword.submit')
          }
        </Button>
      </div>
    </ProCard>
  );
}