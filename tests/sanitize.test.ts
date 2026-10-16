import { describe, expect, it } from 'vitest';
import { sanitize } from '@/lib/sanitize';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('업무 상세내용 저장 (sanitize)', () => {
  it('붙여 넣은 이미지와 편집기 서식(제목·취소선·목록·표)을 지우지 않는다', () => {
    const html = `<h2>제목</h2><p><s>취소</s></p><ol><li data-list="bullet">점</li></ol><table><tr><td>칸</td></tr></table><p><img src="${PNG}"></p>`;
    const out = sanitize(html);
    expect(out).toContain('<h2>제목</h2>');
    expect(out).toContain('<s>취소</s>');
    expect(out).toContain('data-list="bullet"');
    expect(out).toContain('<td>칸</td>');
    expect(out).toContain(`<img src="${PNG}" />`);
  });

  it('스크립트·이벤트·이미지가 아닌 data 주소·너무 큰 이미지는 막는다', () => {
    expect(sanitize('<img src="x" onerror="alert(1)"><script>alert(1)</script>')).toBe('<img src="x" />');
    expect(sanitize('<img src="data:text/html;base64,PHNjcmlwdD4=">')).toBe('');
    expect(sanitize('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitize(`<img src="data:image/png;base64,${'A'.repeat(4_100_000)}">`)).toBe('');
  });
});
