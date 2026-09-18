export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] as const;
export type Frequency = typeof FREQUENCIES[number];

export interface RecurringConfig {
  weekdays?: number[]; // WEEKDAY: 0=일 ~ 6=토
  dayOfMonth?: number; // MONTHLY: 1~28 권장(말일 문제 회피)
  intervalDays?: number; // CUSTOM
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// 주어진 시각(from) 이후로 다음 실행 시각을 계산한다. 규칙 생성 직후 첫 실행 시각 계산과
// 배치 실행 후 다음 실행 시각 계산에 공용으로 쓰인다.
export function computeNextRunAt(from: Date, frequency: string, config?: RecurringConfig | null): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(from, 1);
    case 'WEEKLY':
      return addDays(from, 7);
    case 'MONTHLY': {
      const r = new Date(from);
      const day = config?.dayOfMonth || r.getDate();
      r.setMonth(r.getMonth() + 1);
      r.setDate(Math.min(day, 28));
      return r;
    }
    case 'QUARTERLY': {
      const r = new Date(from);
      r.setMonth(r.getMonth() + 3);
      return r;
    }
    case 'YEARLY': {
      const r = new Date(from);
      r.setFullYear(r.getFullYear() + 1);
      return r;
    }
    case 'WEEKDAY': {
      const weekdays = config?.weekdays?.length ? config.weekdays : [1, 2, 3, 4, 5];
      let r = addDays(from, 1);
      for (let i = 0; i < 8; i++) {
        if (weekdays.includes(r.getDay())) return r;
        r = addDays(r, 1);
      }
      return r;
    }
    case 'CUSTOM':
      return addDays(from, Math.max(1, config?.intervalDays || 1));
    default:
      return addDays(from, 7);
  }
}
