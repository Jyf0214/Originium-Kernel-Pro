'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { message } from 'antd';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useGitHubConfigSync } from '@/hooks/use-github-config-sync';
import { showError } from '@/lib/error';
import { applyAvatarTransform } from './avatar-transform';
import { saveProfile } from './save-profile';
import { syncAvatarChanges } from './sync-avatar';
import type { SettingsFormValues } from './types';

export interface UseSettingsSaveResult {
  loading: boolean;
  DiffModal: ReactNode;
  handleSave: (values: SettingsFormValues) => Promise<void>;
}

interface UseSettingsSaveArgs {
  uid: string | undefined;
  originalAvatar: string;
  githubConfigured: boolean;
  watchedAvatarUrl: string | undefined;
  userName: string;
}

/**
 * 设置页保存逻辑：
 * 1) 调用 /api/user/profile 更新用户名/昵称；
 * 2) 若头像发生变更，触发 useGitHubConfigSync 走 GitHub Diff 流程。
 */
export function useSettingsSave({
  uid,
  originalAvatar,
  githubConfigured,
  watchedAvatarUrl,
  userName,
}: UseSettingsSaveArgs): UseSettingsSaveResult {
  const { refresh } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // 稳定引用，便于 useGitHubConfigSync 内部比较
  const syncCurrentConfig = useMemo(
    () => ({ avatarUrl: watchedAvatarUrl ?? '' }),
    [watchedAvatarUrl],
  );

  const handleSyncComplete = useCallback(() => {
    // 钩子内部已显示成功提示，此处仅刷新用户状态
    void refresh();
  }, [refresh]);

  const handleSyncError = useCallback(() => {
    // 钩子内部已显示错误提示，无需重复显示
  }, []);

  const { handleSave: syncAvatar, DiffModal } = useGitHubConfigSync({
    repo: '',
    githubConfigured,
    remoteConfig: '',
    currentConfig: syncCurrentConfig,
    customTransform: applyAvatarTransform,
    onSyncComplete: handleSyncComplete,
    onSyncError: handleSyncError,
  });

  const handleSave = async (values: SettingsFormValues) => {
    setLoading(true);
    try {
      const ok = await saveProfile(values, t);
      if (!ok) return;

      const newAvatar = values.avatarUrl ?? '';
      if (newAvatar !== originalAvatar && uid) {
        await syncAvatarChanges({
          githubConfigured,
          originalAvatar,
          userName,
          syncAvatar,
          setLoading,
        });
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

  return { loading, DiffModal, handleSave };
}
