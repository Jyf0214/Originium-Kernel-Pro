import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const requests = await prisma.request.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    return NextResponse.json(
      { error: '获取申请列表失败' },
      { status: 500 }
    );
  }
}
