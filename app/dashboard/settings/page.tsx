'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Input, Form, Avatar, message } from 'antd';
import { Button } from '@/components/ui/Button';
import type { Rule } from 'antd/es/form';
import { showError } from '@/lib/error';
import { useGitHubConfigSync } from '@/hooks/use-github-config-sync';
import { GlobalLoading } from '@/components/Loading';
import { User, AtSign, Image as ImageIcon, Save, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import ConfigSection from '@/components/ui/ConfigSection';

// 表单字段组件，适配 Ant Design Form
interface SettingsFormFieldProps {
  name: string;
  label: string;
  icon: React.ReactNode;
  placeholder?: string;
  extra?: string;
  rules?: Rule[];
  children?: React.ReactNode;
}

function SettingsFormField({
  name,
  label,
  icon,
  placeholder,
  extra,
  rules,
  children,
}: SettingsFormFieldProps) {
  return (
    <Form.Item
      name={name}
      label={
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          {label}
        </div>
      }
      extra={extra && <span className="text-xs text-zinc-400">{extra}</span>}
      rules={rules}
    >
      {children ?? (
        <Input
          placeholder={placeholder}
          className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
          allowClear
        />
      )}
    </Form.Item>
  );
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [originalAvatar, setOriginalAvatar] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [configData, setConfigData] = useState<Record<string, unknown> | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const watchedAvatarUrl = Form.useWatch('avatarUrl', form);

  // 页面加载时从 /api/config 获取 GitHub 仓库地址及远程配置数据
  useEffect(() => {
    const fetchGithubInfo = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data._githubRepo) {
            setGithubRepo(data._githubRepo);
          }
          setConfigData(data);
        } else {
          showError('GitHub 配置加载失败');
        }
      } catch {
        showError('GitHub 配置加载失败');
      } finally {
        setConfigLoaded(true);
      }
    };
    void fetchGithubInfo();
  }, []);

  // 头像自定义转换函数：修改 users[uid].avatar 字段
  const avatarCustomTransform = useCallback(
    (remoteObj: Record<string, unknown>, cfg: Record<string, unknown>) => {
      const uid = cfg._uid as string;
      const newAvatar = cfg.avatarUrl as string;
      const users = { ...((remoteObj.users ?? {}) as Record<string, unknown>) };

      if (newAvatar) {
        // 设置/更新头像
        const entry = { ...((users[uid] ?? {}) as Record<string, unknown>) };
        entry.avatar = newAvatar;
        users[uid] = entry;
      } else {
        // 清空头像：从配置中移除 avatar 字段
        if (users[uid]) {
          const entry = { ...(users[uid] as Record<string, unknown>) };
          delete entry.avatar;
          if (Object.keys(entry).length === 0) {
            delete users[uid];
          } else {
            users[uid] = entry;
          }
        }
      }
      return { ...remoteObj, users };
    },
    [],
  );

  // useGitHubConfigSync 配置：稳定引用，仅 _uid 用于 customTransform
  const syncCurrentConfig = useMemo(
    () => ({ avatarUrl: watchedAvatarUrl ?? '', _uid: user?.uid ?? '' }),
    [watchedAvatarUrl, user?.uid],
  );

  const handleSyncComplete = useCallback(() => {
    // 钩子内部已显示成功提示，此处仅刷新用户状态
    void refresh();
  }, [refresh]);

  const handleSyncError = useCallback(() => {
    // 钩子内部已显示错误提示，无需重复显示
  }, []);

  const { handleSave: syncAvatar, DiffModal } = useGitHubConfigSync({
    repo: githubRepo || '',
    remoteConfig: '',
    currentConfig: syncCurrentConfig,
    customTransform: avatarCustomTransform,
    onSyncComplete: handleSyncComplete,
    onSyncError: handleSyncError,
  });

  useEffect(() => {
    if (user && configLoaded) {
      // 优先使用远程配置中的头像，其次本地用户头像
      const remoteAvatar = (configData as { users?: Record<string, { avatar?: string }> } | undefined)
        ?.users?.[user.uid]?.avatar;
      const effectiveAvatar = remoteAvatar ?? user.avatar ?? '';
      setOriginalAvatar(effectiveAvatar);
      form.setFieldsValue({
        avatarUrl: effectiveAvatar,
        username: user.name ?? '',
        displayName: user.displayName ?? user.name ?? '',
      });
      setPageLoading(false);
    }
  }, [user, configLoaded, configData, form]);

  const handleSave = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const uid = user?.uid;

      // 1. 保存用户名/昵称到数据库（不含头像）
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          name: values.displayName ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error ?? t('settings.saveFailed'));
        return;
      }

      // 2. 检测头像是否有变更
      const newAvatar = values.avatarUrl ?? '';
      const avatarChanged = newAvatar !== originalAvatar;

      if (avatarChanged && uid) {
        await syncAvatarChanges(uid);
        return;
      }

      message.success(t('settings.saveSuccess'));
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.saveFailed');
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 同步头像变更到 GitHub 配置 */
  const syncAvatarChanges = async (uid: string) => {
    const configRes = await fetch('/api/config');
    if (!configRes.ok) throw new Error('读取配置失败');
    const configResData = await configRes.json();

    const effectiveRepo = githubRepo ?? configResData._githubRepo ?? '';
    if (!effectiveRepo) {
      message.error('GitHub 未配置，无法同步头像');
      return;
    }

    const remoteRaw = configResData._remoteConfig ?? '';
    if (!remoteRaw) throw new Error('远程配置为空');

    setLoading(false);
    syncAvatar(
      { avatarUrl: originalAvatar, _uid: uid },
      remoteRaw,
      `chore: update avatar for user ${user?.name ?? uid}`,
      effectiveRepo,
    );
  };

  if (pageLoading) {
    return <GlobalLoading />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {t('settings.title')}
            </h1>
            <p className="text-zinc-400 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* 用户卡片 */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-4">
          <div className="p-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar
                  size={72}
                  src={watchedAvatarUrl ?? undefined}
                  icon={!watchedAvatarUrl && <User size={28} />}
                  className="bg-zinc-100 text-zinc-400 shrink-0 border-2 border-white shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-900 mb-0.5">
                  {user?.displayName ?? user?.name ?? '用户'}
                </div>
                <div className="text-sm text-zinc-400">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 表单卡片 */}
        <ConfigSection title={t('settings.title')} color="bg-zinc-500">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{ avatarUrl: '', username: '', displayName: '' }}
            requiredMark={false}
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
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
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
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
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
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
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
        </ConfigSection>

        {DiffModal}
      </div>
    </div>
  );
}
