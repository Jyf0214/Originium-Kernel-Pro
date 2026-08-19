import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { diaryReadGuard } from '@/lib/diary-guard';
import { encryptContent } from '@/lib/diary-crypto';
import { saveDiaryVersion } from '@/lib/diary-version';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { scheduledFilter } from '@/lib/diary-schedule';
import { validateDiaryInput } from '@/lib/diary-input';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/diary');

/**
 * API 密钥细粒度权限检查（日记读写）
 * Cookie 认证(浏览器)由 diaryReadGuard/requireAdmin 处理；密钥认证检查 posts_* 权限
 */
async function requireDiaryPerm(action: 'posts_read' | 'posts_write'): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

export const GET = apiHandler('GET', { label: getTranslate('api.diary.getDiaryList'), requireDb: true }, async (req) => {
  const guard = await diaryReadGuard();
  if (guard) return guard;

  // API 密钥认证的请求需 posts_read 权限
  const denied = await requireDiaryPerm('posts_read');
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const startDate = searchParams.get('startDate')?.trim();
  const endDate = searchParams.get('endDate')?.trim();
  const group = searchParams.get('group')?.trim();

  const ands: Record<string, unknown>[] = [scheduledFilter()];

  if (search) {
    ands.push({
      OR: [
        { title: { contains: search } },
        { tags: { has: search } },
      ],
    });
  }

  if (startDate) {
    ands.push({ date: { gte: new Date(startDate) } });
  }
  if (endDate) {
    ands.push({ date: { lte: new Date(endDate) } });
  }
  if (group) {
    ands.push({ group });
  }

  const where = { AND: ands };

  // 日记列表与分组查询互相独立，并行执行以减少总耗时
  const [diaries, allGroups] = await Promise.all([
    prisma.diary.findMany({
      where,
      orderBy: [
        { pinned: 'desc' },
        { date: 'desc' },
      ],
      take: 200,
      select: {
        id: true,
        title: true,
        tags: true,
        group: true,
        references: true,
        date: true,
        pinned: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.diary.findMany({
      select: { group: true },
      distinct: ['group'],
      where: { group: { not: null } },
    }),
  ]);

  return NextResponse.json({ diaries, groups: allGroups.map((g) => g.group).filter(Boolean) });
});

export const POST = apiHandler('POST', { label: getTranslate('api.diary.createDiary'), requireAdmin: true, requireDb: true }, async (req) => {
  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireDiaryPerm('posts_write');
  if (denied) return denied;

  const body = await req.json() as Record<string, unknown>;
  const validation = validateDiaryInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { title, content, tags, date, group, scheduledAt, references } = validation.value;

  const encrypted = await encryptContent(content);

  // 设置了定时发布时间 → 状态为 draft，否则为 published（非法时间已在校验层拦截）
  const isScheduled = scheduledAt !== undefined && scheduledAt.getTime() > Date.now();

  const diary = await prisma.diary.create({
    data: {
      title,
      content: encrypted,
      tags,
      group,
      references,
      date,
      status: isScheduled ? 'draft' : 'published',
      scheduledAt: isScheduled ? scheduledAt : null,
    },
  });

  // 保存初始版本快照（加密前明文）
  await saveDiaryVersion(diary.id, content, title, tags);

  logger.info('POST', '创建日记成功', { id: diary.id, title, scheduled: isScheduled });
  return NextResponse.json({ diary }, { status: 201 });
});
