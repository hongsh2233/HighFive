'use client';

import React from 'react';
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from '@/lib/constants';
import styles from './TaskFilterBar.module.css';

interface Props {
  status: string;
  workerId: string;
  workers: { id: number; name: string }[];
  onStatusChange: (v: string) => void;
  onWorkerChange: (v: string) => void;
  onReset: () => void;
}

export function TaskFilterBar({ status, workerId, workers, onStatusChange, onWorkerChange, onReset }: Props) {
  return (
    <div className={styles.bar}>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={styles.select}
      >
        <option value="">전체 상태</option>
        {TASK_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
        ))}
      </select>

      <select
        value={workerId}
        onChange={(e) => onWorkerChange(e.target.value)}
        className={styles.select}
      >
        <option value="">전체 작업자</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      <button
        onClick={onReset}
        className={styles.btnReset}
      >
        초기화
      </button>
    </div>
  );
}
