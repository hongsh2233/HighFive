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

export const TASK_STATUS_COLOR: Record<string, { bg: string; text: string; border?: string }> = {
  ASSIGNED: { bg: 'transparent', text: '#1D4ED8', border: '#93C5FD' },
  PROGRESS: { bg: 'transparent', text: '#92400E', border: '#FCD34D' },
  REVIEW:   { bg: 'transparent', text: '#5B21B6', border: '#C4B5FD' },
  QA:       { bg: 'transparent', text: '#155E75', border: '#67E8F9' },
  DONE:     { bg: 'transparent', text: '#065F46', border: '#6EE7B7' },
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
