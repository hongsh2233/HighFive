'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';

export default function PasswordChangePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (authLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-danger)' }}>로그인이 필요합니다.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!currentPassword.trim()) {
        setError('현재 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!newPassword.trim()) {
        setError('새 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('새 비밀번호는 8자 이상이어야 합니다.');
        setLoading(false);
        return;
      }

      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccess('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '500px',
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
        비밀번호 변경
      </h1>

      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>현재 비밀번호 *</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호를 입력하세요."
            style={inputStyle}
            disabled={loading}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>새 비밀번호 *</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호를 입력하세요. (8자 이상)"
            style={inputStyle}
            disabled={loading}
          />
          <p style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: 'var(--space-2)' }}>
            최소 8자, 영문 대소문자, 숫자, 특수문자 포함 권장
          </p>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>새 비밀번호 확인 *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호를 다시 입력하세요."
            style={inputStyle}
            disabled={loading}
          />
        </div>

        <div style={buttonGroupStyle}>
          <button
            type="submit"
            style={submitButtonStyle}
            disabled={loading}
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
          <button
            type="button"
            style={cancelButtonStyle}
            onClick={() => router.back()}
            disabled={loading}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
