import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      );
    }

    const requestRecord = await prisma.request.findUnique({
      where: { id }
    });

    if (!requestRecord) {
      return NextResponse.json(
        { error: '申请不存在' },
        { status: 404 }
      );
    }

    if (requestRecord.status !== 'pending') {
      return NextResponse.json(
        { error: '申请已处理' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const postPath = join(process.cwd(), 'posts', `${requestRecord.postSlug}.md`);
      try {
        await unlink(postPath);
      } catch (error) {
        console.error('删除文章失败:', error);
        return NextResponse.json(
          { error: '删除文章失败' },
          { status: 500 }
        );
      }
    }

    await prisma.request.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('处理申请失败:', error);
    return NextResponse.json(
      { error: '处理申请失败' },
      { status: 500 }
    );
  }
}
