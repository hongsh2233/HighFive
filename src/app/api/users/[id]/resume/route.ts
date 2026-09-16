import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireAuth, successResponse, errorResponse } from '@/lib/utils';

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_RESUME_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

function isAllowedResume(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!ext) return false;
  const allowedExts = ALLOWED_RESUME_TYPES[mimeType];
  if (!allowedExts) return false;
  return allowedExts.includes(ext);
}

// GET /api/users/[id]/resume - 이력서 다운로드 (ADMIN 또는 본인)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const targetId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;
    if (role !== 'ADMIN' && userId !== targetId) {
      return errorResponse('이력서를 조회할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const target = await prisma.user.findFirst({ where: { id: targetId, organizationId } });
    if (!target || !target.resumeData) return errorResponse('이력서를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    return new NextResponse(new Uint8Array(target.resumeData), {
      headers: {
        'Content-Type': target.resumeMimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(target.resumeFilename || 'resume')}`,
        'Content-Length': String(target.resumeSize || target.resumeData.length),
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('이력서 다운로드 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/users/[id]/resume - 이력서 업로드 (ADMIN만)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const targetId = parseInt(id);
    const target = await prisma.user.findFirst({ where: { id: targetId, organizationId } });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const body = await req.json();
    const { filename, mimeType, dataBase64 } = body;
    if (!filename || !mimeType || !dataBase64) {
      return errorResponse('파일 정보가 올바르지 않습니다.', 400, 'VALID_400');
    }
    if (!isAllowedResume(filename, mimeType)) {
      return errorResponse('PDF, DOC, DOCX, JPG, PNG 파일만 업로드할 수 있습니다.', 400, 'VALID_400');
    }

    const base64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_RESUME_BYTES) {
      return errorResponse('이력서 파일은 5MB를 초과할 수 없습니다.', 400, 'VALID_400');
    }

    await prisma.user.update({
      where: { id: targetId },
      data: {
        resumeFilename: filename.slice(0, 200),
        resumeMimeType: mimeType,
        resumeSize: buffer.length,
        resumeData: buffer,
      },
    });

    return successResponse({ resumeFilename: filename.slice(0, 200), resumeSize: buffer.length }, '이력서가 업로드되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('이력서 업로드 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/users/[id]/resume - 이력서 삭제 (ADMIN만)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const targetId = parseInt(id);
    const target = await prisma.user.findFirst({ where: { id: targetId, organizationId } });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    await prisma.user.update({
      where: { id: targetId },
      data: { resumeFilename: null, resumeMimeType: null, resumeSize: null, resumeData: null },
    });

    return successResponse(null, '이력서가 삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('이력서 삭제 중 오류가 발생했습니다.', 500);
  }
}
