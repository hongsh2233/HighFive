import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { addHistory } from '@/lib/task-history';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB per task
const MAX_ATTACHMENT_COUNT = 5;

// 서버측 MIME/확장자 허용목록 — 클라이언트가 보낸 mimeType은 신뢰할 수 없으므로
// 실행/스크립트 가능성이 있는 타입(html, svg, 실행파일 등)을 명시적으로 차단한다.
const ALLOWED_ATTACHMENT_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

function sanitizeFilename(filename: string): string {
  // 경로 구분자를 제거해 파일명만 남기고, 200자로 자른다.
  const base = filename.replace(/^.*[\\/]/, '');
  return base.slice(0, 200);
}

function isAllowedAttachment(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!ext) return false;
  const allowedExts = ALLOWED_ATTACHMENT_TYPES[mimeType];
  if (!allowedExts) return false;
  return allowedExts.includes(ext);
}

// POST /api/tasks/[id]/attachments - 기존 업무에 첨부파일 추가
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session, organizationId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId }, include: { _count: { select: { attachments: true } } } });
    if (!task) return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');

    const canEdit = ['ADMIN', 'LEADER'].includes(role) || task.workerId === userId || task.registrantId === userId;
    if (!canEdit) return errorResponse('첨부파일을 추가할 권한이 없습니다.', 403, 'AUTH_403');

    const body = await req.json();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (attachments.length === 0) return errorResponse('첨부할 파일이 없습니다.', 400, 'VALID_400');

    const existingCount = task._count.attachments;
    if (existingCount + attachments.length > MAX_ATTACHMENT_COUNT) {
      return errorResponse(`첨부파일은 최대 ${MAX_ATTACHMENT_COUNT}개까지 가능합니다.`, 400, 'VALID_400');
    }

    const existingTotal = await prisma.taskAttachment.aggregate({ where: { taskId }, _sum: { size: true } });
    let total = existingTotal._sum.size || 0;

    const rows: { taskId: number; filename: string; mimeType: string; size: number; data: Buffer; uploadedById: number }[] = [];
    for (const item of attachments) {
      if (!item?.filename || !item?.dataBase64) continue;
      const filename = sanitizeFilename(item.filename);
      const mimeType = item.mimeType || 'application/octet-stream';
      if (!isAllowedAttachment(filename, mimeType)) {
        return errorResponse(`${filename}: 허용되지 않는 파일 형식입니다.`, 400, 'VALID_400');
      }
      const base64 = item.dataBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        return errorResponse(`${filename} 파일이 5MB를 초과합니다.`, 400, 'VALID_400');
      }
      total += buffer.length;
      if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
        return errorResponse('첨부파일 전체 용량은 20MB를 초과할 수 없습니다.', 400, 'VALID_400');
      }
      rows.push({
        taskId,
        filename,
        mimeType,
        size: buffer.length,
        data: buffer,
        uploadedById: userId,
      });
    }

    if (rows.length === 0) return errorResponse('첨부할 파일이 없습니다.', 400, 'VALID_400');

    await prisma.taskAttachment.createMany({ data: rows });
    await addHistory(taskId, userId, 'NOTE_UPDATED', `첨부파일 ${rows.length}건 추가`);

    const list = await prisma.taskAttachment.findMany({
      where: { taskId },
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(list, '첨부파일이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('첨부파일 등록 중 오류가 발생했습니다.', 500);
  }
}
