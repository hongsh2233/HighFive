import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function findHeaderRow(rows: unknown[][]): { rowIdx: number; acctIdx: number; dateIdx: number } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const acctIdx = row.findIndex((c) => typeof c === 'string' && c.trim() === '계정과목');
    const dateIdx = row.findIndex((c) => typeof c === 'string' && c.trim() === '일자');
    if (acctIdx >= 0 && dateIdx >= 0) {
      return { rowIdx: i, acctIdx, dateIdx };
    }
  }
  return null;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val.trim().replace(/\./g, '-'));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

// POST /api/expenses/ledger/import - 국세청 간편장부 양식 xlsx 업로드 일괄 등록
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, userId } = await requireExpenseAccess();
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
    const sheetName = wb.SheetNames.includes('장부') ? '장부' : wb.SheetNames[0];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });

    const header = findHeaderRow(rows);
    if (!header) {
      return errorResponse('업로드한 파일에서 일자/계정과목 컬럼을 찾지 못했습니다. 국세청 간편장부 양식을 확인해주세요.', 400, 'VALID_400');
    }

    const { rowIdx, acctIdx, dateIdx } = header;
    const dataRows = rows.slice(rowIdx + 1);
    let imported = 0;
    let skipped = 0;
    const creates = [];

    for (const row of dataRows) {
      if (!row || row.every((c) => c === null || c === '')) continue;
      const entryDate = parseDate(row[dateIdx]);
      const accountItem = row[acctIdx];
      const description = row[acctIdx + 1];
      if (!entryDate || !accountItem || !description) { skipped++; continue; }

      creates.push({
        organizationId: organizationId!,
        authorId: userId!,
        entryDate,
        accountItem: String(accountItem),
        description: String(description),
        counterparty: row[acctIdx + 2] ? String(row[acctIdx + 2]) : null,
        incomeAmount: toNum(row[acctIdx + 3]),
        incomeVat: toNum(row[acctIdx + 4]),
        expenseAmount: toNum(row[acctIdx + 5]),
        expenseVat: toNum(row[acctIdx + 6]),
        assetAmount: toNum(row[acctIdx + 7]),
        assetVat: toNum(row[acctIdx + 8]),
        note: row[acctIdx + 9] ? String(row[acctIdx + 9]) : null,
        source: 'UPLOAD',
      });
      imported++;
    }

    if (creates.length > 0) {
      await prisma.simpleLedgerEntry.createMany({ data: creates });
    }

    return successResponse({ imported, skipped }, `${imported}건 등록, ${skipped}건 건너뜀`);
  } catch (err) {
    console.error(err);
    return errorResponse('간편장부 업로드 중 오류가 발생했습니다.', 500);
  }
}
