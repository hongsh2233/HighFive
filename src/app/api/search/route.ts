import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { runSearch } from '@/lib/search';

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requireAuth();
  if (error) return error;

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const data = await runSearch(organizationId, q);

  return NextResponse.json({ data });
}
