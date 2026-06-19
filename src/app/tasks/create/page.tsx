'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';

export default function TaskCreatePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdDate] = useState(new Date().toLocaleDateString('ko-KR'));

  useEffect(() => {
    if (!authLoading && user) {
      fetchWorkers();
    }
  }, [authLoading, user]);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get('/api/users?role=WORKER');
      setWorkers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!title.trim()) {
        setError('업무 제목을 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!workerId) {
        setError('담당자를 선택해주세요.');
        setLoading(false);
        return;
      }

      await axios.post('/api/tasks', {
        title: title.trim(),
        workerId: parseInt(workerId),
        plannerId: user?.id,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes.trim(),
      });

      setSuccess('업무가 등록되었습니다.');
      setTimeout(() => {
        router.push('/tasks');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || '업무 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  if (!user || !['ADMIN', 'PLANNER'].includes(user.role ?? '')) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-danger)' }}>업무를 등록할 권한이 없습니다.</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '600px',
    margin: '0 auto',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: 'var(--space-6)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 'var(--space-2)',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-gray-900)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-3)',
  };

  const submitButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: 'var(--space-3)',
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    opacity: loading ? 0.6 : 1,
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: 'var(--space-3)',
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const errorStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    backgroundColor: '#FEF2F2',
    border: '1px solid var(--color-danger)',
    borderRadius: '6px',
    color: '#7F1D1D',
    marginBottom: 'var(--space-4)',
  };

  const successStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    backgroundColor: '#D1FAE5',
    border: '1px solid #10B981',
    borderRadius: '6px',
    color: '#065F46',
    marginBottom: 'var(--space-4)',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: 'var(--space-8)' }}>
        업무 등록
      </h1>

      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>등록일자</label>
          <div style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--color-gray-100)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--color-gray-900)',
            fontWeight: '500',
          }}>
            📅 {createdDate} (자동)
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>업무 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: [DCBGIT-39085] 구글 원 2TB 상품 정보 수정"
            style={inputStyle}
            disabled={loading}
          />
          <p style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: 'var(--space-2)' }}>
            선택사항: [RMS-NO] 형식으로 입력하면 자동으로 분류됩니다.
          </p>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>담당자 *</label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            style={inputStyle}
            disabled={loading}
          >
            <option value="">담당자를 선택해주세요.</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name} ({worker.email})
              </option>
            ))}
          </select>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>목표일</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={inputStyle}
            disabled={loading}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>설명 및 노트</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="업무에 대한 상세 설명을 입력해주세요."
            style={textareaStyle}
            disabled={loading}
          />
        </div>

        <div style={buttonGroupStyle}>
          <button
            type="submit"
            style={submitButtonStyle}
            disabled={loading}
          >
            {loading ? '등록 중...' : '등록'}
          </button>
          <button
            type="button"
            style={cancelButtonStyle}
            onClick={() => router.push('/tasks')}
            disabled={loading}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
