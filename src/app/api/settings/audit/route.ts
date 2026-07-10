import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { organizationId, error } = await requireRole(['ADMIN', 'LEADER']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 50;
  const action = searchParams.get('action') || undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: any = { organizationId: organizationId ?? null };
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        detail: true,
        userEmail: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ]);

  return successResponse({ logs, total, page, totalPages: Math.ceil(total / limit) });
}
