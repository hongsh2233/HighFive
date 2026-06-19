'use client';

import React from 'react';
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from '@/lib/constants';

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
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }}
      >
        <option value="">전체 상태</option>
        {TASK_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
        ))}
      </select>

      <select
        value={workerId}
        onChange={(e) => onWorkerChange(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }}
      >
        <option value="">전체 작업자</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      <button
        onClick={onReset}
        style={{
          padding: '6px 12px', borderRadius: 6,
          border: '1px solid #D1D5DB', background: 'transparent',
          color: '#4B5563', fontSize: 13, cursor: 'pointer',
        }}
      >
        초기화
      </button>
    </div>
  );
}
