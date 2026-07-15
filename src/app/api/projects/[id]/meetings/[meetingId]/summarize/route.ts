import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

interface MeetingSummary {
  summary: string;
  decisions: string[];
  actionItems: { text: string; suggestedAssignee: string | null }[];
}

function parseSummaryJson(raw: string): MeetingSummary {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter((d: unknown) => typeof d === 'string') : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((a: any) => a && typeof a.text === 'string')
            .map((a: any) => ({ text: a.text, suggestedAssignee: typeof a.suggestedAssignee === 'string' ? a.suggestedAssignee : null }))
        : [],
    };
  } catch {
    return { summary: raw, decisions: [], actionItems: [] };
  }
}

// POST /api/projects/[id]/meetings/[meetingId]/summarize - AI 회의록 요약(액션아이템/결정사항 구조화)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  try {
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const { id, meetingId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(meetingId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 요약할 수 있습니다.', 403, 'AUTH_403');
    }

    if (!(await isFeatureEnabled(organizationId, 'meetingSummary'))) {
      return errorResponse('AI 회의록 요약 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const note = await prisma.meetingNote.findFirst({ where: { id: noteId, projectId } });
    if (!note) return errorResponse('회의록을 찾을 수 없습니다.', 404);

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const prompt = `다음은 회의록 본문이다. 이 내용을 분석해 아래 JSON 형식으로만 응답하라(다른 설명 텍스트 없이 JSON만 출력):
{
  "summary": "회의 전체 내용을 2~3문장으로 요약",
  "decisions": ["결정된 사항 1", "결정된 사항 2"],
  "actionItems": [{ "text": "실행해야 할 작업 설명", "suggestedAssignee": "본문에서 언급된 담당자 이름 또는 null" }]
}

회의록 제목: ${note.title}
회의록 본문:
${note.content}`;

    const raw = await callClaude(prompt, 1024, apiKey);
    const parsed = parseSummaryJson(raw);

    const updated = await prisma.meetingNote.update({
      where: { id: noteId },
      data: { aiSummary: JSON.stringify(parsed) },
    });

    return successResponse({ ...parsed, updatedAt: updated.updatedAt }, 'AI 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 요약 중 오류가 발생했습니다.', 500);
  }
}
