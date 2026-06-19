'use client';

import React from 'react';
import { TASK_STATUS_COLOR, TASK_STATUS_LABEL, USER_ROLE_LABEL } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = TASK_STATUS_COLOR[status] ?? { bg: 'transparent', text: '#71717A', border: '#D4D4D8' };
  return (
    <span style={{
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border ?? '#D4D4D8'}`,
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {TASK_STATUS_LABEL[status] ?? status}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:   { bg: 'transparent', text: '#DC2626', border: '#FCA5A5' },
  PLANNER: { bg: 'transparent', text: '#7C3AED', border: '#C4B5FD' },
  WORKER:  { bg: 'transparent', text: '#1D4ED8', border: '#93C5FD' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const color = roleColors[role] ?? { bg: 'transparent', text: '#71717A', border: '#D4D4D8' };
  return (
    <span style={{
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}
