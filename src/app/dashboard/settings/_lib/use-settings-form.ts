'use client';

import { useEffect, useState } from 'react';
import { Form } from 'antd';
import type { FormInstance } from 'antd/es/form/Form';
import type { RemoteConfigData, SettingsFormValues } from './types';

export interface UseSettingsFormResult {
  form: FormInstance<SettingsFormValues>;
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

  useEffect(() => {
    if (user && configLoaded) {
      // 头像从 configData.avatar.url 读取（远程配置中的全局头像 URL）
      const effectiveAvatar = configData?.avatar?.url ?? user.avatar ?? '/avatar.jpg';
      setOriginalAvatar(effectiveAvatar);
      form.setFieldsValue({
        avatarUrl: effectiveAvatar,
        username: user.name ?? '',
        displayName: user.displayName ?? user.name ?? '',
      });
      setPageReady(true);
    }
  }, [user, configLoaded, configData, form]);

  return { form, originalAvatar, pageReady };
}
