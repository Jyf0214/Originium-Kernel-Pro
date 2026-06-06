/**
 * 头像字段合并函数：修改 users[uid].avatar 字段
 *
 * - 当 cfg.avatarUrl 有值时，设置/更新对应用户的 avatar
 * - 当 cfg.avatarUrl 为空时，从配置中移除 avatar 字段
 */
export function applyAvatarTransform(
  remoteObj: Record<string, unknown>,
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const uid = cfg._uid as string;
  const newAvatar = cfg.avatarUrl as string;
  const users = { ...((remoteObj.users ?? {}) as Record<string, unknown>) };

  if (newAvatar) {
    // 设置/更新头像
    const entry = { ...((users[uid] ?? {}) as Record<string, unknown>) };
    entry.avatar = newAvatar;
    users[uid] = entry;
  } else {
    // 清空头像：从配置中移除 avatar 字段
    const existing = users[uid] as Record<string, unknown> | undefined;
    if (existing) {
      const entry = { ...existing };
      delete entry.avatar;
      if (Object.keys(entry).length === 0) {
        delete users[uid];
      } else {
        users[uid] = entry;
      }
    }
  }
  return { ...remoteObj, users };
}
