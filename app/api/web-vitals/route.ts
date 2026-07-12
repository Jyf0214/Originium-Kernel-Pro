import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';

/**
 * Web Vitals API — 已迁移到 @vercel/analytics
 *
 * GET: 返回提示信息，引导管理员查看 Vercel Dashboard
 * POST: 不再接收自建采集数据，返回 410 Gone
 */

export const POST = apiHandler('POST', { label: 'Web Vitals（已废弃）' }, () => {
  return NextResponse.json(
    { error: '自建采集已停用，请使用 @vercel/analytics' },
    { status: 410 },
  );
});

export const GET = apiHandler('GET', { label: 'Web Vitals 状态', requireSudo: true }, () => {
  return NextResponse.json({
    migrated: true,
    message: 'Web Vitals 数据已迁移到 Vercel Analytics Dashboard',
    dashboard: 'https://vercel.com/.analytics',
  }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});
