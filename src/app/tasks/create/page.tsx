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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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

      setSuccess('업무가 성공적으로 등록되었습니다.');
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
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  if (!user || !['ADMIN', 'PLANNER'].includes(user.role ?? '')) {
    return (
      <div style={{ padding: 'var(--space-8)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontWeight: '600' }}>업무를 등록할 권한이 없습니다.</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8) var(--space-4)',
    maxWidth: '640px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-6) var(--space-8)',
    borderRadius: '16px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-md)',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: 'var(--space-5)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gray-700)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-6)',
  };

  const submitButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    opacity: loading ? 0.6 : 1,
    boxShadow: '0 4px 12px rgba(88, 80, 236, 0.2)',
    transition: 'all 0.2s',
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'var(--color-gray-200)',
    color: 'var(--color-gray-800)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const errorStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: 'var(--color-danger-light)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: 'var(--color-danger-dark)',
    marginBottom: 'var(--space-5)',
    fontSize: '13px',
    fontWeight: 600,
  };

  const successStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    color: 'var(--color-success-dark)',
    marginBottom: 'var(--space-5)',
    fontSize: '13px',
    fontWeight: 600,
  };

  const getCustomInputStyle = (name: string): React.CSSProperties => {
    const isFocused = focusedInput === name;
    return {
      ...inputStyle,
      borderColor: isFocused ? 'var(--color-primary)' : 'var(--color-gray-300)',
      boxShadow: isFocused ? '0 0 0 3px var(--color-primary-glow), var(--shadow-sm)' : 'var(--shadow-sm)',
    };
  };

  const getCustomTextareaStyle = (name: string): React.CSSProperties => {
    const isFocused = focusedInput === name;
    return {
      ...textareaStyle,
      borderColor: isFocused ? 'var(--color-primary)' : 'var(--color-gray-300)',
      boxShadow: isFocused ? '0 0 0 3px var(--color-primary-glow), var(--shadow-sm)' : 'var(--shadow-sm)',
    };
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: 'var(--space-6)', letterSpacing: '-0.02em' }}>
        업무 등록
      </h1>

      {error && <div style={errorStyle}>⚠️ {error}</div>}
      {success && <div style={successStyle}>✅ {success}</div>}

      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>등록일자</label>
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-gray-100)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-gray-700)',
              fontWeight: '600',
              border: '1px solid var(--color-gray-200)',
            }}>
              📅 {createdDate} <span style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginLeft: '6px' }}>(자동 설정)</span>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>업무 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setFocusedInput('title')}
              onBlur={() => setFocusedInput(null)}
              placeholder="예: [RMS-39085] 구글 정보 수정"
              style={getCustomInputStyle('title')}
              disabled={loading}
              required
            />
            <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '6px', fontWeight: 500 }}>
              💡 [RMS-NO] 형식으로 작성하면 자동으로 태스크 번호로 분류 처리됩니다.
            </p>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>담당자 배정 *</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              onFocus={() => setFocusedInput('workerId')}
              onBlur={() => setFocusedInput(null)}
              style={getCustomInputStyle('workerId')}
              disabled={loading}
              required
            >
              <option value="">담당 팀원을 지정해주세요.</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} ({worker.email})
                </option>
              ))}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>완료 목표일</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              onFocus={() => setFocusedInput('targetDate')}
              onBlur={() => setFocusedInput(null)}
              style={getCustomInputStyle('targetDate')}
              disabled={loading}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>설명 및 노트</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => setFocusedInput('notes')}
              onBlur={() => setFocusedInput(null)}
              placeholder="업무 진행 시 참고할 가이드나 세부 노트를 입력하세요."
              style={getCustomTextareaStyle('notes')}
              disabled={loading}
            />
          </div>

          <div style={buttonGroupStyle}>
            <button
              type="submit"
              style={submitButtonStyle}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(88, 80, 236, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 80, 236, 0.2)';
              }}
            >
              {loading ? '등록하는 중...' : '업무 등록하기'}
            </button>
            <button
              type="button"
              style={cancelButtonStyle}
              onClick={() => router.push('/tasks')}
              disabled={loading}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-300)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'; }}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
