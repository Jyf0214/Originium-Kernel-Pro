'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { showError } from '@/lib/error';

/** 限制非 sudo 用户访问,无权限时跳转回 /faces */
export function useEditPermission(): { isSudo: boolean; authLoading: boolean } {
  const { isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isSudo) {
      showError('无权限访问此页面');
      router.push('/faces');
    }
  }, [isSudo, authLoading, router]);

  return { isSudo, authLoading };
}
