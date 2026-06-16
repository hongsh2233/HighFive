'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg-base)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-8)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: 'var(--space-4)',
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
    padding: 'var(--space-2) var(--space-3)',
    fontSize: '14px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    opacity: loading ? 0.6 : 1,
  };

  const errorStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: '#FEF2F2',
    border: '1px solid var(--color-danger)',
    borderRadius: '6px',
    color: '#7F1D1D',
    marginBottom: 'var(--space-4)',
    fontSize: '13px',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: 'var(--space-2)', textAlign: 'center' }}>
          TMS
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-gray-600)',
            marginBottom: 'var(--space-8)',
            fontSize: '13px',
          }}
        >
          업무 관리 시스템
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={buttonStyle}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  'var(--color-primary-dark)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                'var(--color-primary)';
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
