'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';

/** 限制无 root 权限的用户访问（root 角色或 sudo 模式），无权限时跳转回 /faces */
export function useEditPermission(): { isRoot: boolean; authLoading: boolean } {
  const { isRoot, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!authLoading && !isRoot) {
      showError(t('faces.noPermission'));
      router.push('/faces');
    }
  }, [isRoot, authLoading, router, t]);

  return { isRoot, authLoading };
}
