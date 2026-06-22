'use client';

import React from 'react';
import { TASK_STATUS_LABEL, USER_ROLE_LABEL } from '@/lib/constants';
import styles from './Badge.module.css';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={styles.badge} data-status={status}>
      {TASK_STATUS_LABEL[status] ?? status}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={styles.badge} data-role={role}>
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}
