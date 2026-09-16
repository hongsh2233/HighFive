import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const MAX_EXTRACT_CHARS = 12000; // LLM 프롬프트에 넣을 최대 문자 수(과금/토큰 한도 보호)

export const DOC_SUMMARY_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractXlsx(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) {
      parts.push(`[시트: ${sheetName}]\n${csv}`);
    }
  }
  return parts.join('\n\n');
}

// mimeType 기반으로 docx/xlsx에서 텍스트를 추출한다. 지원하지 않는 형식이면 null.
export async function extractDocumentText(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (await extractDocx(buffer)).slice(0, MAX_EXTRACT_CHARS);
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return extractXlsx(buffer).slice(0, MAX_EXTRACT_CHARS);
  }
  return null;
}
