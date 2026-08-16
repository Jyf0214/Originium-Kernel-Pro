import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { queryAuditLogs } from '@/lib/audit';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

export const GET = apiHandler('GET', { label: getTranslate('api.admin.auditLogQuery'), requireRoot: true }, async (req) => {
  // API 密钥细粒度权限：审计日志需 audit_read
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'audit_read');
    if (permErr) return permErr;
  }

  const { searchParams } = req.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10) || 20));
  const action = searchParams.get('action') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const target = searchParams.get('target') ?? undefined;

  const result = await queryAuditLogs({
    action,
    target,
    userId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return NextResponse.json({
    logs: result.items,
    total: result.total,
    page,
    pageSize,
  });
});
