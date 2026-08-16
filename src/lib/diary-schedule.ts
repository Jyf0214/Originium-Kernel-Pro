/**
 * 日记定时发布过滤
 *
 * POST/PUT 在 scheduledAt 为未来时间时将日记置为 draft 状态，
 * 到期后（scheduledAt <= now）才对外可见。所有读取路径（列表/详情/导出）
 * 必须使用同一套条件，避免定时草稿通过详情或导出泄露。
 */

/** 构建排除定时未发布日记的过滤条件（Prisma where 片段） */
export function scheduledFilter() {
  return {
    OR: [
      { scheduledAt: null },
      { scheduledAt: { lte: new Date() } },
    ],
  };
}

/** 判断日记是否处于"定时未到期"状态（对外不可见） */
export function isScheduledPending(diary: {
  status: string;
  scheduledAt: Date | null;
}): boolean {
  return (
    diary.status === 'draft' &&
    diary.scheduledAt !== null &&
    diary.scheduledAt.getTime() > Date.now()
  );
}