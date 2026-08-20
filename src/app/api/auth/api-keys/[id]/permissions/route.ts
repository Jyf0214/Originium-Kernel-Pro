/**
 * 单个 API 密钥权限管理
 * GET    /api/auth/api-keys/[id]/permissions  → 获取密钥权限
 * PATCH  /api/auth/api-keys/[id]/permissions  → 更新密钥权限
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { parsePermissions, serializePermissions, type ApiKeyPermissions } from '@/lib/api-key-permissions';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

/** 获取指定密钥的权限 */
export const GET = apiHandler<{ id: string }>(
  'GET',
  { label: 'api-keys.permissions.get', requireAuth: true },
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
      const row = await db.prisma.apiKey.findUnique({
        where: { id },
        select: { uid: true, permissions: true },
      });
      if (row?.uid !== session.uid) {
        return NextResponse.json({ error: getTranslate('api.auth.keyNotFound') }, { status: 404 });
      }
      return NextResponse.json({ permissions: parsePermissions(row.permissions) });
    } catch (err) {
      console.error('[api-keys.permissions.get] 查询失败', err);
      return NextResponse.json({ error: getTranslate('api.auth.queryFailed') }, { status: 500 });
    }
  }
);

/** 更新指定密钥的权限 */
export const PATCH = apiHandler<{ id: string }>(
  'PATCH',
  { label: 'api-keys.permissions.update', requireAuth: true },
  async (req, context) => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: getTranslate('api.common.notLoggedIn') }, { status: 401 });

    const db = getDb();
    if (!db.prisma) {
      return NextResponse.json({ error: getTranslate('api.common.dbNotConfigured') }, { status: 503 });
    }

    const id = await getParam(context, 'id');
    if (!id) return NextResponse.json({ error: getTranslate('api.auth.missingKeyId') }, { status: 400 });

    let body: { permissions: ApiKeyPermissions | null };
    try {
      body = (await req.json()) as { permissions: ApiKeyPermissions | null };
    } catch {
      return NextResponse.json({ error: getTranslate('api.common.invalidBody') }, { status: 400 });
    }

    // 校验 permissions 结构
    if (body.permissions !== null && (!body.permissions || typeof body.permissions.actions !== 'object')) {
      return NextResponse.json({ error: getTranslate('api.auth.invalidPermissionsFormat') }, { status: 400 });
    }

    try {
      // 确保只能修改自己的密钥
      const row = await db.prisma.apiKey.findUnique({ where: { id }, select: { uid: true } });
      if (row?.uid !== session.uid) {
        void logAudit('api_key_permissions_update_failed', 'auth', '修改 API 密钥权限失败：密钥不存在或无权限', session.uid);
        return NextResponse.json({ error: getTranslate('api.auth.keyNotFound') }, { status: 404 });
      }

      const permissionsJson = body.permissions ? serializePermissions(body.permissions) : null;
      await db.prisma.apiKey.update({
        where: { id },
        data: { permissions: permissionsJson },
      });

      void logAudit('api_key_permissions_update', 'auth', `修改 API 密钥权限：${id}`, session.uid);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[api-keys.permissions.update] 更新失败', err);
      void logAudit('api_key_permissions_update_failed', 'auth', '修改 API 密钥权限失败', session.uid);
      return NextResponse.json({ error: getTranslate('api.auth.updateFailed') }, { status: 500 });
    }
  }
);
