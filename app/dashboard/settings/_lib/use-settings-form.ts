'use client';

import { useEffect, useState } from 'react';
import { Form } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { RemoteConfigData, SettingsFormValues } from './types';

export interface UseSettingsFormResult {
  form: FormInstance<SettingsFormValues>;
  watchedAvatarUrl: string | undefined;
  originalAvatar: string;
  pageReady: boolean;
}

interface UseSettingsFormArgs {
  user: { uid: string; name?: string | null; displayName?: string | null; avatar?: string | null } | null;
  configData: RemoteConfigData | null;
  configLoaded: boolean;
}

/**
 * 管理设置表单状态：表单实例、watch 头像字段、原始头像、首次初始化与 pageReady 状态。
 * 当用户与远程配置都加载完成后，把头像/用户名/昵称写入表单。
 */
export function useSettingsForm({
  user,
  configData,
  configLoaded,
}: UseSettingsFormArgs): UseSettingsFormResult {
  const [form] = Form.useForm<SettingsFormValues>();
  const [originalAvatar, setOriginalAvatar] = useState('');
  const [pageReady, setPageReady] = useState(false);
  const watchedAvatarUrl = Form.useWatch('avatarUrl', form);

  useEffect(() => {
    if (user && configLoaded) {
      // 优先使用远程配置中的头像，其次本地用户头像
      const remoteAvatar = configData?.users?.[user.uid]?.avatar;
      const effectiveAvatar = remoteAvatar ?? user.avatar ?? '';
      setOriginalAvatar(effectiveAvatar);
      form.setFieldsValue({
        avatarUrl: effectiveAvatar,
        username: user.name ?? '',
        displayName: user.displayName ?? user.name ?? '',
      });
      setPageReady(true);
    }
  }, [user, configLoaded, configData, form]);

  return { form, watchedAvatarUrl, originalAvatar, pageReady };
}
