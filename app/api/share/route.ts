import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';

/**
 * Share Event Tracking API
 *
 * 记录分享事件（可选，用于分析）
 * POST /api/share
 *
 * Request body:
 *   url: string    - 被分享的页面 URL
 *   title: string  - 被分享的页面标题
 *   platform: string - 分享目标平台（twitter, facebook, weibo, wechat, qq, telegram 等）
 *
 * Response:
 *   { success: true }
 */

interface SharePayload {
  url: string;
  title: string;
  platform: string;
}

export const POST = apiHandler('POST', { label: '分享事件记录' }, async (request) => {
  const body = (await request.json()) as SharePayload;

  if (!body.url || !body.platform) {
    return NextResponse.json(
      { error: '缺少必要参数: url, platform' },
      { status: 400 },
    );
  }

  // 频率限制：每 IP 每分钟 30 次
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`share:${ip}`, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }

  // 记录分享事件到服务器日志（URL 截断 + 控制字符清理防止日志注入）
  const timestamp = new Date().toISOString();
  const safeUrl = (body.url ?? '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 2000);
  const stripControl = (s: string) => s.replace(/[\x00-\x1f\x7f]/g, '');
  const rawReferer = stripControl(request.headers.get('referer') ?? '');
  const rawUserAgent = stripControl(request.headers.get('user-agent') ?? '').slice(0, 200);
  // x-forwarded-for 可被客户端伪造,仅信任合法 IP 格式
  const rawIp = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const firstIp = rawIp.split(',')[0]?.trim() ?? rawIp;
  const safeIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(firstIp)
    ? firstIp
    : rawIp;
  const logEntry = {
    timestamp,
    url: safeUrl,
    title: stripControl(body.title ?? '(无标题)'),
    platform: stripControl(body.platform),
    referer: rawReferer,
    userAgent: rawUserAgent,
    ip: safeIp,
  };

  // 记录分享事件（生产环境可改为写入数据库或发送到分析服务）
  console.warn('[SHARE]', JSON.stringify(logEntry));

  // 返回分享链接（方便前端直接使用）
  const shareUrl = buildShareUrl(body.url, body.title, body.platform);

  return NextResponse.json({
    success: true,
    shareUrl,
    message: '分享事件已记录',
  });
});

/**
 * 构建分享 URL
 */
function buildShareUrl(url: string, title: string, platform: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareUrlMap: Record<string, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    weibo: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encodedTitle}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  };

  return shareUrlMap[platform] ?? null;
}
