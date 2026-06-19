'use client';

import React, { useState } from 'react';
import apiClient from '@/lib/api-client';

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 13, color: '#374151' }}>
        보정 시간 (시간 단위, + / − 가능)
      </label>
      <input
        type="number"
        step="0.25"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14 }}
      />
      {error && <p style={{ color: '#DC2626', fontSize: 12, margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'transparent', cursor: 'pointer' }}>
          취소
        </button>
        <button type="submit" disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 6, background: '#1A56DB', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
