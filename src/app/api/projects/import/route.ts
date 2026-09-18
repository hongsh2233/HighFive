import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// POST /api/projects/import - 프로젝트 일괄 등록 xlsx 업로드 (ADMIN/LEADER)
// 헤더: 프로젝트명 / 설명(선택) / PM이름(선택)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const body = await req.json();
    const { filename, dataBase64 } = body;
    if (!filename || !dataBase64) return errorResponse('파일이 없습니다.', 400, 'VALID_400');
    if (!/\.xlsx?$/i.test(filename)) return errorResponse('xlsx 또는 xls 파일만 업로드할 수 있습니다.', 400, 'VALID_400');

    const base64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) return errorResponse('파일은 5MB를 초과할 수 없습니다.', 400, 'VALID_400');

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const userId = parseInt((session!.user as any).id || '0');
    const existingNames = new Set((await prisma.project.findMany({ where: { organizationId }, select: { name: true } })).map((p) => p.name.trim()));

    let imported = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row['프로젝트명'] ?? row['name'] ?? '').trim();
      if (!name) { skipped.push({ row: i + 2, reason: '프로젝트명 누락' }); continue; }
      if (existingNames.has(name)) { skipped.push({ row: i + 2, reason: '이미 존재하는 프로젝트명' }); continue; }

      const description = row['설명'] ?? row['description'] ?? null;
      const projectManagerName = row['PM이름'] ?? row['projectManagerName'] ?? null;

      await prisma.project.create({
        data: {
          name,
          description: description ? String(description) : null,
          projectManagerName: projectManagerName ? String(projectManagerName) : null,
          createdBy: userId,
          organizationId,
        },
      });
      existingNames.add(name);
      imported++;
    }

    return successResponse({ imported, skipped, skippedCount: skipped.length }, '프로젝트 일괄 등록 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('프로젝트 일괄 등록 중 오류가 발생했습니다.', 500);
  }
}
