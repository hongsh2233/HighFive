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
  LEADER: 'LEADER',
  WORKER: 'WORKER',
} as const;

export const USER_ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  LEADER: '리더',
  WORKER: '작업자',
};

export const TASK_STATUS_ORDER = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];

export const TASK_LABELS = {
  URGENT: 'URGENT',
  WEEKEND: 'WEEKEND',
  EMERGENCY: 'EMERGENCY',
} as const;

export const TASK_LABEL_LIST = ['URGENT', 'WEEKEND', 'EMERGENCY'];

export const TASK_LABEL_TEXT: Record<string, string> = {
  URGENT: '긴급',
  WEEKEND: '주말대응',
  EMERGENCY: '비상',
};

export const TASK_LABEL_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  URGENT: { bg: 'rgba(220,38,38,0.08)', text: '#DC2626', border: '#FCA5A5' },
  WEEKEND: { bg: 'rgba(217,119,6,0.08)', text: '#B45309', border: '#FCD34D' },
  EMERGENCY: { bg: 'rgba(124,58,237,0.08)', text: '#6D28D9', border: '#C4B5FD' },
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
