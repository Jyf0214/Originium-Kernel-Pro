'use client';

import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import ConfigSection from '@/components/ui/ConfigSection';
import { SettingsPageHeader } from './SettingsPageHeader';
import { UserCard } from './UserCard';
import { SettingsForm } from './SettingsForm';
import { useConfigData } from '../_lib/use-config-data';
import { useSettingsForm } from '../_lib/use-settings-form';
import { useSettingsSave } from '../_lib/use-settings-save';

/**
 * 设置页主容器：负责装配数据 hook + 子组件，等待页面就绪后渲染表单。
 */
export function SettingsPageContent() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { configData, configLoaded, githubRepo } = useConfigData();
  const { form, watchedAvatarUrl, originalAvatar, pageReady } = useSettingsForm({
    user,
    configData,
    configLoaded,
  });
  const { loading, DiffModal, handleSave } = useSettingsSave({
    uid: user?.uid,
    originalAvatar,
    githubRepo,
    watchedAvatarUrl,
    userName: user?.name ?? user?.uid ?? '',
  });

  if (!pageReady) {
    return <GlobalLoading />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <SettingsPageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />
        <UserCard
          displayName={user?.displayName ?? user?.name ?? '用户'}
          email={user?.email ?? ''}
          avatarUrl={watchedAvatarUrl ?? ''}
        />
        <ConfigSection title={t('settings.title')} color="bg-zinc-500">
          <SettingsForm form={form} loading={loading} onSubmit={handleSave} />
        </ConfigSection>
        {DiffModal}
      </div>
    </div>
  );
}
