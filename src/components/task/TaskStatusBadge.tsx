'use client';

import React from 'react';
import { StatusBadge } from '@/components/common/Badge';
import { TaskStatus } from '@/types';

interface Props {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: Props) {
  return <StatusBadge status={status} />;
}
