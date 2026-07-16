'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';

/** 限制非 sudo 用户访问,无权限时跳转回 /faces */
export function useEditPermission(): { isSudo: boolean; authLoading: boolean } {
  const { isSudo, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!authLoading && !isSudo) {
      showError(t('faces.noPermission'));
      router.push('/faces');
    }
  }, [isSudo, authLoading, router, t]);

  return { isSudo, authLoading };
}
