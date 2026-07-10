import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, successResponse, errorResponse } from '@/lib/utils';

export async function GET(_req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrgs,
      activeOrgs,
      newOrgsThisMonth,
      totalUsers,
      newUsersThisMonth,
      planCounts,
      recentOrgs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.organization.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { role: { not: 'SUPERADMIN' } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart }, role: { not: 'SUPERADMIN' } } }),
      prisma.organization.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
    ]);

    const planDistribution: Record<string, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    planCounts.forEach((p) => { planDistribution[p.plan] = p._count.id; });

    return successResponse({
      totalOrgs,
      activeOrgs,
      inactiveOrgs: totalOrgs - activeOrgs,
      newOrgsThisMonth,
      totalUsers,
      newUsersThisMonth,
      planDistribution,
      recentOrgs,
    });
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
