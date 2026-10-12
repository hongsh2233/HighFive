import { describe, expect, it } from 'vitest';
import { formatTaskKey, parseTaskKey, withTaskKey } from '../src/lib/task-key';

describe('HighFive 업무 번호', () => {
  it('기존/신규/하위 업무 모두 원래 DB id로 번호가 정해지고 수정으로 바뀌지 않는다', () => {
    const original = { id: 123, title: '기존 업무', projectId: 1, rmsNo: 'EXT-77' };
    const moved = { ...original, title: '바뀐 제목', projectId: 2, taskKey: 'HF-999999' };
    expect(withTaskKey(original).taskKey).toBe('HF-000123');
    expect(withTaskKey(moved).taskKey).toBe('HF-000123');
    expect(withTaskKey(original)).toMatchObject(original);
    const group = withTaskKey({ id: 124, subTasks: [{ id: 125 }, { id: 126 }] });
    expect(group.subTasks).toEqual([{ id: 125, taskKey: 'HF-000125' }, { id: 126, taskKey: 'HF-000126' }]);
    expect(original).not.toHaveProperty('taskKey');
  });
  it('백만 이후에도 번호를 자르지 않아 서로 다른 id가 충돌하지 않는다', () => {
    expect(formatTaskKey(1)).toBe('HF-000001');
    expect(formatTaskKey(1000001)).toBe('HF-1000001');
    expect(formatTaskKey(2147483647)).toBe('HF-2147483647');
  });
  it('정확한 번호만 읽고 잘린/음수/0/오버플로 번호는 다른 업무로 해석하지 않는다', () => {
    expect(parseTaskKey(' hf-000123 ')).toBe(123);
    expect(parseTaskKey('HF-1000001')).toBe(1000001);
    for (const input of ['HF-0', 'HF--1', 'HF-123oops', 'HF-1e2', 'HF-2147483648', '123', 'HF-', 'HF-1.5']) {
      expect(parseTaskKey(input)).toBeNull();
    }
    for (const input of [0, -1, 1.5, NaN, 2147483648]) expect(() => formatTaskKey(input)).toThrow();
  });
});
