import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const HEADER_ALIASES: Record<string, string[]> = {
  approvedDate: ['승인일자'],
  approvedTime: ['승인시간'],
  amount: ['승인금액', '금액'],
  merchant: ['거래처명', '사용처'],
  category: ['항목'],
  projectName: ['프로젝트명'],
  description: ['사용내역'],
  address: ['주소'],
  approvalNo: ['승인번호'],
};

function findHeaderRow(rows: unknown[][]): { rowIdx: number; colMap: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const colMap: Record<string, number> = {};
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      const idx = row.findIndex((cell) => typeof cell === 'string' && aliases.includes(cell.trim()));
      if (idx >= 0) colMap[key] = idx;
    }
    // 최소한 승인일자/승인금액/거래처명은 있어야 헤더 행으로 인정
    if (colMap.approvedDate !== undefined && colMap.amount !== undefined && colMap.merchant !== undefined) {
      return { rowIdx: i, colMap };
    }
  }
  return null;
}

function parseDate(dateVal: unknown, timeVal: unknown): Date | null {
  if (dateVal instanceof Date) {
    const d = new Date(dateVal);
    if (timeVal && typeof timeVal === 'string') {
      const [h, m, s] = timeVal.split(':').map((v) => parseInt(v) || 0);
      d.setHours(h, m, s || 0);
    }
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal === 'string') {
    const datePart = dateVal.trim().replace(/\./g, '-').replace(/-$/, '');
    const timePart = typeof timeVal === 'string' ? timeVal.trim() : '00:00:00';
    const d = new Date(`${datePart}T${timePart}`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// POST /api/expenses/cards/import - 법인카드 명세서 xlsx 업로드 일괄 등록
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, userId } = await requireCardExpenseAccess();
    if (error) return error;

    const body = await req.json();
    const { filename, dataBase64 } = body;
    if (!filename || !dataBase64) {
      return errorResponse('파일이 없습니다.', 400, 'VALID_400');
    }
    if (!/\.xlsx?$/i.test(filename)) {
      return errorResponse('xlsx 또는 xls 파일만 업로드할 수 있습니다.', 400, 'VALID_400');
    }

    const base64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) {
      return errorResponse('파일은 5MB를 초과할 수 없습니다.', 400, 'VALID_400');
    }

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames.includes('사용내역') ? '사용내역' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const header = findHeaderRow(rows);
    if (!header) {
      return errorResponse('업로드한 파일에서 승인일자/승인금액/거래처명 컬럼을 찾지 못했습니다. 양식을 확인해주세요.', 400, 'VALID_400');
    }

    // 카드번호(있으면): "보고용" 시트에서 "카드번호" 라벨 옆 셀을 찾는다.
    let cardNumberMasked: string | null = null;
    if (wb.SheetNames.includes('보고용')) {
      const reportRows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['보고용'], { header: 1, defval: null });
      for (const row of reportRows) {
        const idx = row.findIndex((c) => typeof c === 'string' && c.trim() === '카드번호');
        if (idx >= 0 && row[idx + 1]) {
          cardNumberMasked = String(row[idx + 1]);
          break;
        }
      }
    }

    const projects = await prisma.project.findMany({ where: { organizationId }, select: { id: true, name: true } });
    const projectByName = new Map(projects.map((p) => [p.name.trim(), p.id]));

    const { colMap } = header;
    const dataRows = rows.slice(header.rowIdx + 1);
    let imported = 0;
    let skipped = 0;

    const creates = [];
    for (const row of dataRows) {
      if (!row || row.every((c) => c === null || c === '')) continue;
      const amountRaw = row[colMap.amount];
      const merchant = row[colMap.merchant];
      const approvedAt = parseDate(row[colMap.approvedDate], colMap.approvedTime !== undefined ? row[colMap.approvedTime] : null);
      if (!approvedAt || !merchant || amountRaw === null || amountRaw === undefined) {
        skipped++;
        continue;
      }
      const amount = Math.round(Number(amountRaw));
      if (!Number.isFinite(amount)) { skipped++; continue; }

      const projectNameRaw = colMap.projectName !== undefined ? (row[colMap.projectName] as string | null) : null;
      const resolvedProjectId = projectNameRaw ? projectByName.get(String(projectNameRaw).trim()) ?? null : null;

      creates.push({
        organizationId: organizationId!,
        userId: userId!,
        cardNumberMasked,
        approvedAt,
        amount,
        merchant: String(merchant),
        category: colMap.category !== undefined ? String(row[colMap.category] ?? '기타') : '기타',
        projectId: resolvedProjectId,
        projectNameRaw: resolvedProjectId ? null : (projectNameRaw ? String(projectNameRaw) : null),
        description: colMap.description !== undefined ? (row[colMap.description] ? String(row[colMap.description]) : null) : null,
        address: colMap.address !== undefined ? (row[colMap.address] ? String(row[colMap.address]) : null) : null,
        approvalNo: colMap.approvalNo !== undefined ? (row[colMap.approvalNo] ? String(row[colMap.approvalNo]) : null) : null,
        source: 'UPLOAD',
      });
      imported++;
    }

    if (creates.length > 0) {
      await prisma.cardTransaction.createMany({ data: creates });
    }

    return successResponse({ imported, skipped }, `${imported}건 등록, ${skipped}건 건너뜀`);
  } catch (err) {
    console.error(err);
    return errorResponse('법인카드 명세서 업로드 중 오류가 발생했습니다.', 500);
  }
}
