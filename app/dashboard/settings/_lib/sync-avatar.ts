import { message } from 'antd';
import type { RemoteConfigData } from './types';

export interface SyncAvatarChangesArgs {
  githubRepo: string;
  originalAvatar: string;
  uid: string;
  userName: string;
  syncAvatar: (
    initial: Record<string, unknown>,
    remote: string,
    commitMessage: string,
    repo: string,
  ) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * 同步头像变更到 GitHub 配置：拉取远程配置，定位仓库，
 * 然后通过 useGitHubConfigSync 的 DiffModal 让用户确认提交。
 */
export async function syncAvatarChanges({
  githubRepo,
  originalAvatar,
  uid,
  userName,
  syncAvatar,
  setLoading,
}: SyncAvatarChangesArgs): Promise<void> {
  const configRes = await fetch('/api/config');
  if (!configRes.ok) throw new Error('读取配置失败');
  const configResData: RemoteConfigData = await configRes.json();
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
    `chore: update avatar for user ${userName}`,
    effectiveRepo,
  );
}
