import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse, hashPassword, generateTempPassword } from '@/lib/utils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const VALID_ROLES = ['ADMIN', 'LEADER', 'WORKER', 'PARTNER'];

// POST /api/users/import - 팀원 일괄 등록 xlsx 업로드 (ADMIN 전용)
// 헤더: 이메일 / 이름 / 역할(선택, 기본 WORKER) / 소속그룹(선택)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
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

    const created: { email: string; name: string; tempPassword: string }[] = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = String(row['이메일'] ?? row['email'] ?? '').trim().toLowerCase();
      const name = String(row['이름'] ?? row['name'] ?? '').trim();
      const roleRaw = String(row['역할'] ?? row['role'] ?? 'WORKER').trim().toUpperCase();
      const orgUnit = row['소속그룹'] ?? row['orgUnit'] ?? null;

      if (!email || !email.includes('@') || !name) {
        skipped.push({ row: i + 2, reason: '이메일 또는 이름 누락' });
        continue;
      }
      const role = VALID_ROLES.includes(roleRaw) ? roleRaw : 'WORKER';

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        skipped.push({ row: i + 2, reason: '이미 존재하는 이메일' });
        continue;
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      await prisma.user.create({
        data: { email, name, role, passwordHash, isActive: true, orgUnit: orgUnit ? String(orgUnit) : null, organizationId },
      });
      created.push({ email, name, tempPassword });
    }

    return successResponse({ created, skipped, importedCount: created.length, skippedCount: skipped.length }, '팀원 일괄 등록 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('팀원 일괄 등록 중 오류가 발생했습니다.', 500);
  }
}
