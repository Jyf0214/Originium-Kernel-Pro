import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler } from '@/lib/api-handler';
import { decryptContentBatch } from '@/lib/diary-crypto';
import { getTranslate } from '@/i18n/translate';

// 分批导出上限，防止内存耗尽
const BATCH_SIZE = 100;
const MAX_ENTRIES = 10000;

export const GET = apiHandler('GET', { label: getTranslate('api.diary.exportDiary'), requireAdmin: true, requireDb: true }, async () => {
  // 预检：日记总数超限则拒绝导出，避免内存耗尽
  const totalCount = await prisma.diary.count();
  if (totalCount > MAX_ENTRIES) {
    return NextResponse.json(
      { error: getTranslate('api.diary.exportLimitExceeded', { totalCount, maxEntries: MAX_ENTRIES }) },
      { status: 413 },
    );
  }

  const parts: string[] = [];
  let exportedCount = 0;

  // 分批读取并解密，避免一次性加载全部日记到内存
  for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
    const batch = await prisma.diary.findMany({
      orderBy: { date: 'desc' },
      skip: offset,
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    const decryptedContents = await decryptContentBatch(batch.map((d) => d.content));

    batch.forEach((d, i) => {
      const content = decryptedContents[i];
      const date = d.date.toISOString().slice(0, 10);
      const tags = d.tags.length > 0 ? d.tags.join(', ') : '';
      const pinned = d.pinned ? getTranslate('api.diary.yes') : getTranslate('api.diary.no');

      const front = [
        `# ${d.title}`,
        '',
        getTranslate('api.diary.exportDateLabel', { date }),
      ];
      if (tags) front.push(getTranslate('api.diary.exportTagsLabel', { tags }));
      front.push(getTranslate('api.diary.exportPinnedLabel', { pinned }));
      front.push('', '---', '');

      parts.push([...front, content, '', '---', '', ''].join('\n'));
    });

    exportedCount += batch.length;
  }

  const markdown = [
    getTranslate('api.diary.exportTitle'),
    '',
    getTranslate('api.diary.exportTimeLabel', { time: new Date().toLocaleString('zh-CN') }),
    getTranslate('api.diary.exportCountLabel', { count: exportedCount }),
    '',
    '---',
    '',
    ...parts,
  ].join('\n');

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="diary-export-${new Date().toISOString().slice(0, 10)}.md"`,
      'Cache-Control': 'private, no-store, no-cache',
    },
  });
});
