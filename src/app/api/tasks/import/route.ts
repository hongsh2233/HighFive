import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse, parseRmsNo } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

// POST /api/tasks/import - 업무 일괄 등록 xlsx 업로드 (ADMIN/LEADER)
// 헤더: 제목 / 담당자(이름 또는 이메일) / 목표일(선택) / 프로젝트(선택, 이름) / 우선순위(선택) / 비고(선택)
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

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const registrantId = parseInt((session!.user as any).id || '0');
    const [users, projects] = await Promise.all([
      prisma.user.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, email: true } }),
      prisma.project.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    ]);
    const userByNameOrEmail = new Map<string, number>();
    users.forEach((u) => { userByNameOrEmail.set(u.name.trim(), u.id); userByNameOrEmail.set(u.email.toLowerCase(), u.id); });
    const projectByName = new Map(projects.map((p) => [p.name.trim(), p.id]));

    let imported = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const titleRaw = String(row['제목'] ?? row['title'] ?? '').trim();
      const workerKey = String(row['담당자'] ?? row['worker'] ?? '').trim();
      if (!titleRaw || !workerKey) { skipped.push({ row: i + 2, reason: '제목 또는 담당자 누락' }); continue; }

      const workerId = userByNameOrEmail.get(workerKey) ?? userByNameOrEmail.get(workerKey.toLowerCase());
      if (!workerId) { skipped.push({ row: i + 2, reason: `담당자를 찾을 수 없음(${workerKey})` }); continue; }

      const projectNameRaw = row['프로젝트'] ?? row['project'] ?? null;
      const projectId = projectNameRaw ? projectByName.get(String(projectNameRaw).trim()) ?? null : null;

      const targetDateRaw = row['목표일'] ?? row['targetDate'] ?? null;
      const targetDate = targetDateRaw ? (targetDateRaw instanceof Date ? targetDateRaw : new Date(targetDateRaw)) : null;

      const priorityRaw = String(row['우선순위'] ?? row['priority'] ?? 'NORMAL').trim().toUpperCase();
      const priority = VALID_PRIORITIES.includes(priorityRaw) ? priorityRaw : 'NORMAL';

      const notes = row['비고'] ?? row['notes'] ?? null;

      const { cleanTitle, rmsNo } = parseRmsNo(titleRaw);
      const [initialStatus] = await getProjectStatuses(projectId);

      await prisma.task.create({
        data: {
          title: cleanTitle,
          rmsNo,
          workerId,
          registrantId,
          projectId,
          targetDate: targetDate && !isNaN(targetDate.getTime()) ? targetDate : null,
          priority,
          notes: notes ? String(notes) : null,
          status: initialStatus.code,
          organizationId,
        },
      });
      imported++;
    }

    return successResponse({ imported, skipped, skippedCount: skipped.length }, '업무 일괄 등록 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 일괄 등록 중 오류가 발생했습니다.', 500);
  }
}
