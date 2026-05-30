import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler } from '@/lib/api-handler';
import { decryptContent } from '@/lib/diary-crypto';

export const GET = apiHandler('GET', { label: '导出日记', requireAdmin: true }, async () => {
  const diaries = await prisma.diary.findMany({
    orderBy: { date: 'desc' },
  });

  const entries = await Promise.all(
    diaries.map(async (d) => ({
      id: d.id,
      title: d.title,
      content: await decryptContent(d.content),
      tags: d.tags,
      date: d.date.toISOString().slice(0, 10),
      pinned: d.pinned,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  );

  return NextResponse.json({ entries, exportedAt: new Date().toISOString() });
});
