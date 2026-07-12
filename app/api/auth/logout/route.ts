import { deleteSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/auth/logout');

/**
 * POST /api/auth/logout
 * 销毁当前会话，清除 cookie
 */
export const POST = apiHandler('POST', { label: '用户登出' }, async () => {
  await deleteSession();
  logger.info('POST', '用户登出成功');
  return Response.json({ success: true });
});
