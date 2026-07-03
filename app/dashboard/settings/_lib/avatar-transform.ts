/**
 * 头像字段合并函数：修改 auth.admin.avatar 字段（全局唯一头像）
 *
 * - 当 cfg.avatarUrl 有值时，设置 auth.admin.avatar
 * - 当 cfg.avatarUrl 为空时，清空 auth.admin.avatar
 */
export function applyAvatarTransform(
  remoteObj: Record<string, unknown>,
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const newAvatar = cfg.avatarUrl as string;
  const auth = { ...((remoteObj.auth ?? {}) as Record<string, unknown>) };
  const admin = { ...((auth.admin ?? {}) as Record<string, unknown>) };

  if (newAvatar) {
    admin.avatar = newAvatar;
  } else {
    delete admin.avatar;
  }

  auth.admin = admin;
  return { ...remoteObj, auth };
}
