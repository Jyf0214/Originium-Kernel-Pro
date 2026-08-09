/**
 * 单个 API 密钥操作
 * DELETE /api/auth/api-keys/[id]  → 撤销密钥
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { getTranslate } from '@/i18n/translate';

export const DELETE = apiHandler<{ id: string }>(
  'DELETE',
  { label: 'api-keys.delete', requireAuth: true },
  async (_req, context) => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: getTranslate('api.common.notLoggedIn') }, { status: 401 });

    const db = getDb();
    if (!db.prisma) {
      return NextResponse.json({ error: getTranslate('api.common.dbNotConfigured') }, { status: 503 });
    }

    const id = await getParam(context, 'id');
    if (!id) return NextResponse.json({ error: getTranslate('api.auth.missingKeyId') }, { status: 400 });

    try {
      // 确保只能删除自己的密钥
      const row = await db.prisma.apiKey.findUnique({ where: { id }, select: { uid: true } });
      if (row?.uid !== session.uid) {
        return NextResponse.json({ error: getTranslate('api.auth.keyNotFound') }, { status: 404 });
      }
      await db.prisma.apiKey.delete({ where: { id } });
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      console.error('[api-keys.delete] 删除失败', err);
      return NextResponse.json({ error: getTranslate('common.deleteFailed') }, { status: 500 });
    }
  }
);
