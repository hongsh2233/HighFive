export const TASK_STATUS = {
  ASSIGNED: 'ASSIGNED',
  PROGRESS: 'PROGRESS',
  REVIEW: 'REVIEW',
  QA: 'QA',
  DONE: 'DONE',
} as const;

export const TASK_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수중',
  QA: 'QA',
  DONE: '완료',
};

export const TASK_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: '#DBEAFE', text: '#1E40AF' },
  PROGRESS: { bg: '#FEF3C7', text: '#92400E' },
  REVIEW:   { bg: '#EDE9FE', text: '#5B21B6' },
  QA:       { bg: '#CFFAFE', text: '#155E75' },
  DONE:     { bg: '#D1FAE5', text: '#065F46' },
};

export const USER_ROLE = {
  ADMIN: 'ADMIN',
  PLANNER: 'PLANNER',
  WORKER: 'WORKER',
} as const;

export const USER_ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  PLANNER: '기획자',
  WORKER: '작업자',
};

export const TASK_STATUS_ORDER = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
