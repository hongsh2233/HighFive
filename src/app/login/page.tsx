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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
    backgroundColor: '#0F172A',
    backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%)',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: 'var(--space-8) var(--space-8) var(--space-10)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: 'var(--space-5)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'var(--font-display)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    color: 'white',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'linear-gradient(to right, var(--color-primary), #6366f1)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(88, 80, 236, 0.3)',
    marginTop: 'var(--space-4)',
  };

  const errorStyle: React.CSSProperties = {
    padding: '10px 14px',
    backgroundColor: 'rgba(254, 242, 242, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    color: '#FCA5A5',
    marginBottom: 'var(--space-5)',
    fontSize: '13px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            fontSize: '28px',
            marginBottom: 'var(--space-1)',
            textAlign: 'center',
            background: 'linear-gradient(to right, #818CF8, #C7D2FE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}
        >
          📊 TMS
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: 'var(--space-8)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          업무 관리 시스템
        </p>

        {error && <div style={errorStyle}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com"
              style={{
                ...inputStyle,
                borderColor: focusedInput === 'email' ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                boxShadow: focusedInput === 'email' ? '0 0 0 3px rgba(88, 80, 236, 0.3)' : 'none',
              }}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              disabled={loading}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                ...inputStyle,
                borderColor: focusedInput === 'password' ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(88, 80, 236, 0.3)' : 'none',
              }}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            style={buttonStyle}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(88, 80, 236, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(88, 80, 236, 0.3)';
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
