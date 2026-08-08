import type { NextResponse } from 'next/server';
import { ApiErr } from '@/lib/api-handler';
import { getSession, isRootRole } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import { isDiaryPublic } from '@/lib/diary-access';
import { getTranslate } from '@/i18n/translate';

/**
 * 日记读取权限守卫：access.diary 公开时匿名可读；否则仅管理员可读。
 * 返回 null 表示允许，否则返回拒绝响应。
 */
export async function diaryReadGuard(): Promise<NextResponse | null> {
  const session = await getSession();
  const isAdmin = !!session && (session.role === 'admin' || isRootRole(session.role));
  if (isAdmin) return null;
  const config = await loadConfig();
  if (isDiaryPublic(config.access.diary)) return null;
  return session
    ? ApiErr.forbidden(getTranslate('api.diary.privateDiary'))
    : ApiErr.unauthorized(getTranslate('api.diary.privateDiary'));
}
