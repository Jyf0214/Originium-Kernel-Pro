/**
 * 头像字段合并函数：修改 avatar.url 字段（全局唯一头像）
 *
 * - 当 cfg.avatarUrl 有值时，设置 avatar.url
 * - 当 cfg.avatarUrl 为空时，清空 avatar.url
 */
export function applyAvatarTransform(
  remoteObj: Record<string, unknown>,
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const newAvatar = cfg.avatarUrl as string;
  const avatar = { ...((remoteObj.avatar ?? {}) as Record<string, unknown>) };

  if (newAvatar) {
    avatar.url = newAvatar;
  } else {
    delete avatar.url;
  }

  return { ...remoteObj, avatar };
}
