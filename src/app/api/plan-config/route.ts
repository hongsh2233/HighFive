import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireSuperAdmin, successResponse, errorResponse } from '@/lib/utils';

const DEFAULT_FEATURES = {
  FREE: ['info', 'requests', 'wiki', 'tasks', 'search'],
  PRO: ['info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync'],
  ENTERPRISE: ['info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync', 'integrations'],
};

async function getConfig() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return (config?.planFeatures as Record<string, string[]>) ?? DEFAULT_FEATURES;
}

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    const planFeatures = await getConfig();

    if (role === 'SUPERADMIN') {
      return successResponse(planFeatures);
    }

    const plan: string = (session!.user as any).organizationPlan ?? 'FREE';
    const features: string[] = planFeatures[plan] ?? planFeatures['FREE'] ?? [];
    return successResponse({ features });
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { planFeatures } = body;

    if (!planFeatures || typeof planFeatures !== 'object') {
      return errorResponse('올바른 플랜 설정 데이터가 필요합니다.', 400);
    }

    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: { planFeatures },
      create: { id: 1, planFeatures },
    });

    return successResponse(config.planFeatures);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
