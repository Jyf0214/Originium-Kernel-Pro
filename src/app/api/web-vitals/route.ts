import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { getTranslate } from '@/i18n/translate';

/**
 * Web Vitals API — 已迁移到 @vercel/analytics
 *
 * GET: 返回提示信息，引导管理员查看 Vercel Dashboard
 * POST: 不再接收自建采集数据，返回 410 Gone
 */

export const POST = apiHandler('POST', { label: getTranslate('api.webVitals.deprecatedLabel') }, () => {
  return NextResponse.json(
    { error: getTranslate('api.webVitals.selfHostingDisabled') },
    { status: 410 },
  );
});

export const GET = apiHandler('GET', { label: getTranslate('api.webVitals.statusLabel'), requireSudo: true }, () => {
  return NextResponse.json({
    migrated: true,
    message: getTranslate('api.webVitals.migrated'),
    dashboard: 'https://vercel.com/.analytics',
  }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});
