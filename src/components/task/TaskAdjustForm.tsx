'use client';

import React, { useState } from 'react';
import apiClient from '@/lib/api-client';
import styles from './TaskAdjustForm.module.css';

interface Props {
  taskId: number;
  logId: number;
  currentAdjusted: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskAdjustForm({ taskId, logId, currentAdjusted, onSuccess, onCancel }: Props) {
  const [hours, setHours] = useState(currentAdjusted.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const adjustedHours = parseFloat(hours);
    if (isNaN(adjustedHours)) { setError('올바른 숫자를 입력하세요.'); return; }

    setLoading(true);
    try {
      await apiClient.patch(`/tasks/${taskId}/timelogs/${logId}/adjust`, { adjustedHours });
      onSuccess();
    } catch {
      setError('공수 보정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label className={styles.label}>
        보정 시간 (시간 단위, + / − 가능)
      </label>
      <input
        type="number"
        step="0.25"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className={styles.input}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.btnCancel}>
          취소
        </button>
        <button type="submit" disabled={loading} className={styles.btnSubmit}>
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
