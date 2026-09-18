import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';

const HEALTH_LABEL: Record<string, string> = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', ON_HOLD: '보류', COMPLETED: '완료' };

// POST /api/ai/project-status-summary - 프로젝트 상태 한 줄 요약(소속 멤버 또는 ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'projectStatusSummary'))) {
      return errorResponse('AI 프로젝트 상태 요약 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'projectStatusSummary');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const projectId = parseInt(body.projectId);
    if (!projectId) return errorResponse('projectId가 필요합니다.', 400, 'VALID_400');

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);
    if (role !== 'ADMIN') {
      const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
      if (!membership) return errorResponse('해당 프로젝트 멤버만 요약할 수 있습니다.', 403, 'AUTH_403');
    }

    const [tasks, milestones] = await Promise.all([
      prisma.task.findMany({ where: { projectId, isGroup: false }, select: { status: true, targetDate: true } }),
      prisma.projectMilestone.findMany({ where: { projectId }, select: { title: true, dueDate: true, isDone: true } }),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const overdue = tasks.filter((t) => t.status !== 'DONE' && t.targetDate && t.targetDate < today).length;
    const milestoneLines = milestones.map((m) => `- ${m.title}${m.dueDate ? ` (${m.dueDate.toISOString().slice(0, 10)})` : ''}: ${m.isDone ? '완료' : '진행중'}`).join('\n') || '(없음)';

    const prompt = `다음 프로젝트 현황을 근거로 경영진이 1분 안에 읽을 수 있는 3문장 이내 한국어 요약을 작성하라. 숫자를 지어내지 말고 주어진 데이터만 근거로 삼아라.

프로젝트명: ${project.name}
상태(PM 설정): ${HEALTH_LABEL[project.healthStatus] ?? project.healthStatus}
전체 업무: ${total}건, 완료: ${done}건, 지연: ${overdue}건

[마일스톤]
${milestoneLines}`;

    const summary = await callLLM(providerInfo.provider, prompt, 384, providerInfo.apiKey);
    return successResponse({ summary, total, done, overdue }, 'AI 프로젝트 상태 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 프로젝트 상태 요약 중 오류가 발생했습니다.', 500);
  }
}
