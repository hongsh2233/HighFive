// 지아 연동(수신함·활동)이 업무 상세내용을 읽는 형식 — 두 API가 같은 규칙을 쓴다
// 업무 상세내용(HTML)을 지아가 읽을 수 있는 짧은 텍스트로 — 줄바꿈은 살리고 태그·엔티티는 정리
const NOTES_CHARS = 1000;
export function notesText(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  if (!text) return null;
  return text.length > NOTES_CHARS ? `${text.slice(0, NOTES_CHARS)}…` : text;
}

