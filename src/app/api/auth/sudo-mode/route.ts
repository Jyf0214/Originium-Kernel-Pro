import { type NextRequest, NextResponse } from 'next/server';
import { getSession, createSudoMode, clearSudoMode, isRootRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/hash';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/sudo-mode');

/**
 * 进入 sudo 模式（admin 临时提权，15 分钟）
 *
 * POST /api/auth/sudo-mode
 * Body: { password: string }
 * - 仅 admin 角色可提权（root 本身拥有全部权限，无需提权）
 * - 密码验证通过后签发 15 分钟 sudo_mode cookie
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: getTranslate('lib.auth.requireLogin') }, { status: 401 });
    }
    if (isRootRole(session.role)) {
      return NextResponse.json({ error: getTranslate('api.auth.sudoModeNotNeeded') }, { status: 400 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: getTranslate('api.auth.sudoModeAdminOnly') }, { status: 403 });
    }

    const rl = checkRateLimit(req, 'sudo-mode', 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '提权请求频率超限', { uid: session.uid, retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: getTranslate('api.auth.requestTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: getTranslate('api.auth.missingPassword') }, { status: 400 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      return NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 });
    }
    const user = JSON.parse(userStr) as Record<string, unknown>;
    if (typeof user.password !== 'string') {
      return NextResponse.json({ error: getTranslate('api.auth.passwordDataCorrupted') }, { status: 500 });
    }

    if (!(await verifyPassword(password, user.password))) {
      logger.warn('POST', 'sudo 模式密码错误', { uid: session.uid });
      void logAudit('sudo_mode_failed', 'auth', getTranslate('api.auth.sudoModeEnterFailed'), session.uid);
      return NextResponse.json({ error: getTranslate('api.auth.sudoModeWrongPassword') }, { status: 401 });
    }

    await createSudoMode(session.uid);

    logger.info('POST', '进入 sudo 模式', { uid: session.uid });
    void logAudit('sudo_mode_enter', 'auth', getTranslate('api.auth.sudoModeActive'), session.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '进入 sudo 模式失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.sudoModeEnterFailed') }, { status: 500 });
  }
}

/**
 * 退出 sudo 模式
 *
 * DELETE /api/auth/sudo-mode
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: getTranslate('lib.auth.requireLogin') }, { status: 401 });
    }
    await clearSudoMode();
    logger.info('DELETE', '退出 sudo 模式', { uid: session.uid });
    void logAudit('sudo_mode_exit', 'auth', getTranslate('api.auth.sudoModeExited'), session.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('DELETE', '退出 sudo 模式失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.sudoModeExitFailed') }, { status: 500 });
  }
}