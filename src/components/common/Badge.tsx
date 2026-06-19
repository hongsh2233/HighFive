'use client';

import React from 'react';
import { TASK_STATUS_COLOR, TASK_STATUS_LABEL, USER_ROLE_LABEL } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = TASK_STATUS_COLOR[status] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <span
      style={{
        backgroundColor: color.bg,
        color: color.text,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {TASK_STATUS_LABEL[status] ?? status}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      style={{
        backgroundColor: '#EFF6FF',
        color: '#1E40AF',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}
