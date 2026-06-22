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
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
    }}>
      {/* 좌측 브랜드 패널 */}
      <div style={{
        width: '42%',
        background: 'linear-gradient(145deg, #18181B 0%, #27272A 50%, #1C1C2E 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,106,210,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,106,210,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 로고 */}
        <div style={{ marginBottom: 48, position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48, height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #5E6AD2, #7C85E0)',
            marginBottom: 24,
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>T</span>
          </div>
          <h1 style={{ color: '#FAFAFA', fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
            TMS
          </h1>
          <p style={{ color: 'rgba(250,250,250,0.55)', fontSize: 14, lineHeight: 1.7 }}>
            Task Management System<br />
            AI 웹 개발 비즈니스에 최적화된<br />
            경량 업무 관리 플랫폼
          </p>
        </div>

        {/* 기능 목록 */}
        <div style={{ position: 'relative' }}>
          {[
            { icon: '⚡', label: '실시간 칸반 보드' },
            { icon: '⏱', label: '타임 트래킹 & 공수 분석' },
            { icon: '🔔', label: 'Slack · 잔디 자동 알림' },
            { icon: '📊', label: '통계 리포트 & CSV 내보내기' },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ color: 'rgba(250,250,250,0.70)', fontSize: 13 }}>{item.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* 우측 로그인 폼 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '64px 48px',
        backgroundColor: '#FFFFFF',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', marginBottom: 8 }}>
              로그인
            </h2>
            <p style={{ fontSize: 13, color: '#71717A' }}>
              TMS 계정으로 로그인하세요
            </p>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', marginBottom: 6,
                fontSize: 13, fontWeight: 600, color: '#09090B',
              }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 13,
                  border: '1px solid #E4E4E7',
                  borderRadius: 8,
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  backgroundColor: '#FAFAFA',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#5E6AD2'; e.target.style.backgroundColor = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E4E4E7'; e.target.style.backgroundColor = '#FAFAFA'; }}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', marginBottom: 6,
                fontSize: 13, fontWeight: 600, color: '#09090B',
              }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 13,
                  border: '1px solid #E4E4E7',
                  borderRadius: 8,
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  backgroundColor: '#FAFAFA',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#5E6AD2'; e.target.style.backgroundColor = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E4E4E7'; e.target.style.backgroundColor = '#FAFAFA'; }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                background: loading ? '#A5B4FC' : 'linear-gradient(135deg, #5E6AD2, #7C85E0)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 12, color: '#A1A1AA', textAlign: 'center' }}>
            계정 문의는 시스템 관리자에게 연락하세요
          </p>
        </div>
      </div>
    </div>
  );
}
