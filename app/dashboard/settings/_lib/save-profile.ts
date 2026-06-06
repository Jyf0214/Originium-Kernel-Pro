import { showError } from '@/lib/error';
import type { SettingsFormValues } from './types';

type Translator = (key: string) => string;

/**
 * 调用后端接口更新用户名/昵称（不含头像）。
 * 返回 true 表示成功，false 表示已展示错误。
 */
export async function saveProfile(
  values: SettingsFormValues,
  t: Translator,
): Promise<boolean> {
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
    return false;
  }
  return true;
}
