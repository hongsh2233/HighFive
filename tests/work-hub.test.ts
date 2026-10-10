import { describe, expect, it } from 'vitest';
import { focusTasks, taskRisk, dueDays, isDone } from '../src/lib/work-hub';
import { task, getStatuses } from './fixtures';
const now = new Date('2026-10-10T23:00:00');
describe('업무 집계', () => {
  it('시간 차이 대신 현지 날짜로 오늘 마감을 판정한다', () => {
    expect(dueDays(task({ targetDate: '2026-10-10T01:00:00' }), now)).toBe(0);
    expect(dueDays(task({ targetDate: null }), now)).toBeNull();
  });
  it('프로젝트의 커스텀 완료 단계를 지연에서 제외한다', () => {
    const finished = task({ status: 'FINISHED', targetDate: '2026-10-01' });
    expect(isDone(finished, getStatuses)).toBe(true);
    expect(focusTasks([finished], 'overdue', getStatuses, now)).toEqual([]);
    expect(taskRisk(finished, getStatuses, now)).toBeNull();
  });
  it('그룹 업무는 집계에서 제외하고 하위 업무는 포함한다', () => {
    expect(focusTasks([task({ isGroup: true, targetDate: '2026-10-10' }), task({ id: 2, parentTaskId: 1, targetDate: '2026-10-10' })], 'today', getStatuses, now).map(t => t.id)).toEqual([2]);
  });
  it('월요일부터 일요일까지 이번 주를 포함한다', () => {
    const items = ['2026-10-04T12:00:00', '2026-10-05T12:00:00', '2026-10-11T12:00:00', '2026-10-12T12:00:00'].map((date, i) => task({ id: i, targetDate: date }));
    expect(focusTasks(items, 'week', getStatuses, now).map(t => t.id)).toEqual([1, 2]);
  });
  it('완료 업무는 대기로 잡히지 않으며 선행 업무 위험을 구분한다', () => {
    expect(focusTasks([task({ status: 'FINISHED', hasIncompleteBlockers: true })], 'waiting', getStatuses, now)).toEqual([]);
    expect(taskRisk(task({ hasIncompleteBlockers: true }), getStatuses, now)).toBe('선행 업무 대기');
  });
  it('없는 날짜와 잘못된 날짜는 마감 위험으로 표시하지 않는다', () => {
    expect(taskRisk(task({ targetDate: null }), getStatuses, now)).toBeNull();
    expect(dueDays(task({ targetDate: 'invalid' }), now)).toBeNull();
  });
});
