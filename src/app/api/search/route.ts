import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { runSearch, SearchFilters } from '@/lib/search';

// GET /api/search?q=&type=&projectId=&authorId=&from=&to=
export async function GET(req: NextRequest) {
  const { error, session, organizationId } = await requireAuth();
  if (error) return error;

  const userId = parseInt((session!.user as any).id || '0');
  const role = (session!.user as any).role;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const filters: SearchFilters = {
    projectId: searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : undefined,
    authorId: searchParams.get('authorId') ? parseInt(searchParams.get('authorId')!) : undefined,
    from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
    to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    types: searchParams.get('types') ? searchParams.get('types')!.split(',') : undefined,
  };

  const data = await runSearch(organizationId, q, { userId, role }, filters);

  return NextResponse.json({ data });
}
