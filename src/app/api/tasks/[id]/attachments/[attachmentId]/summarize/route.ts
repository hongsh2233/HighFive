import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';
import { extractDocumentText, DOC_SUMMARY_MIME_TYPES } from '@/lib/document-extract';

// POST /api/tasks/[id]/attachments/[attachmentId]/summarize - 첨부 문서(docx/xlsx) AI 요약
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'docSummary'))) {
      return errorResponse('AI 문서 요약 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const { id, attachmentId } = await params;
    const taskId = parseInt(id);

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: parseInt(attachmentId), taskId, task: { organizationId } },
    });
    if (!attachment) return errorResponse('첨부파일을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    if (attachment.aiSummary) {
      return successResponse({ summary: attachment.aiSummary, cached: true }, '캐시된 요약을 반환했습니다.');
    }

    if (!DOC_SUMMARY_MIME_TYPES.includes(attachment.mimeType)) {
      return errorResponse('docx 또는 xlsx 파일만 AI 요약을 지원합니다.', 400, 'VALID_400');
    }

    const text = await extractDocumentText(Buffer.from(attachment.data), attachment.mimeType);
    if (!text || !text.trim()) {
      return errorResponse('문서에서 텍스트를 추출하지 못했습니다.', 400, 'VALID_400');
    }

    const providerInfo = await getFeatureProvider(organizationId, 'docSummary');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const prompt = `아래는 "${attachment.filename}" 문서에서 추출한 내용이다. 한국어로 핵심 내용을 요약하라. 문서 종류(회의록/요구사항/보고서 등)를 먼저 한 줄로 밝히고, 이어서 핵심 사항을 불릿으로 정리하라. 내용이 표(csv) 형태라면 주요 행/열의 의미를 파악해 요약하라. 원문에 없는 내용을 지어내지 마라.

[문서 내용]
${text}`;

    const summary = await callLLM(providerInfo.provider, prompt, 1024, providerInfo.apiKey);

    await prisma.taskAttachment.update({ where: { id: attachment.id }, data: { aiSummary: summary } });

    return successResponse({ summary, cached: false }, 'AI 문서 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 문서 요약 중 오류가 발생했습니다.', 500);
  }
}
