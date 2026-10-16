import { describe, expect, it } from 'vitest';
import { notesText } from '@/lib/task-notes';

// 지아 수신함(배정 업무)·활동 API가 같이 쓰는 상세내용 정리 — 비어 있으면 null이라 지아가 '어떤 업무인지' 물어본다
describe('notesText', () => {
  it('HTML 태그·엔티티를 정리하고 줄바꿈은 살린다', () => {
    expect(notesText('<p>GA4 태그 점검</p><ul><li>방문 통계 &amp; 이벤트</li></ul>')).toBe('GA4 태그 점검\n방문 통계 & 이벤트');
  });
  it('비어 있거나 공백·태그뿐이면 null', () => {
    expect(notesText(null)).toBeNull();
    expect(notesText('')).toBeNull();
    expect(notesText('<p> </p><br/>')).toBeNull();
  });
});
