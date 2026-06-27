import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/requests/[id]');

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'approve' && action !== 'reject') {
      logger.warn('PATCH', '无效操作', { action });
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      );
    }

    logger.info('PATCH', '处理申请', { id, action });

    const requestRecord = await prisma.request.findUnique({
      where: { id }
    });

    if (!requestRecord) {
      logger.warn('PATCH', '申请不存在', { id });
      return NextResponse.json(
        { error: '申请不存在' },
        { status: 404 }
      );
    }

    if (requestRecord.status !== 'pending') {
      logger.warn('PATCH', '申请已处理', { id, status: requestRecord.status });
      return NextResponse.json(
        { error: '申请已处理' },
        { status: 400 }
      );
    }

    // 先更新 DB 状态，再删除文件——避免文件删除后 DB 失败导致数据丢失
    await prisma.request.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected'
      }
    });

    if (action === 'approve') {
      const postPath = join(process.cwd(), 'posts', `${requestRecord.postSlug}.md`);
      try {
        await unlink(postPath);
      } catch (error) {
        // 文件残留比数据丢失安全，仅记录警告不回滚
        logger.warn('PATCH', '删除文章文件失败（DB 已更新，文件残留）', {
          postSlug: requestRecord.postSlug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('PATCH', '申请处理成功', { id, action });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('PATCH', '处理申请失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: '处理申请失败' },
      { status: 500 }
    );
  }
}
