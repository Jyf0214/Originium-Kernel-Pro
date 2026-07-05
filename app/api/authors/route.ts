import { NextResponse } from 'next/server';
import { getAuthors } from '@/lib/authors';

/** GET /api/authors — 返回作者列表 */
export function GET() {
  const authors = getAuthors();
  return NextResponse.json(authors);
}
