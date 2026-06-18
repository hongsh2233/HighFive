'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'WORKER',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get<{ data: User[] }>('/users');
      setUsers(response.data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setMessage({ type: 'error', text: '사용자 목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [authLoading, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await apiClient.post('/users', {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      });

      setMessage({ type: 'success', text: '사용자가 성공적으로 초대되었습니다.' });
      setFormData({ email: '', name: '', role: 'WORKER' });
      setShowForm(false);
      await fetchUsers();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || '사용자 초대에 실패했습니다.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1400px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', color: 'var(--color-danger)', fontWeight: '600' }}>
        관리자만 접근 가능합니다.
      </div>
    );
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 18px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-6)',
    borderRadius: '12px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-6)',
  };

  const formStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const submitButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--color-primary)',
  };

  const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--color-gray-200)',
    color: 'var(--color-gray-800)',
  };

  const messageStyle: React.CSSProperties = {
    padding: '12px var(--space-4)',
    borderRadius: '8px',
    marginBottom: 'var(--space-6)',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const successMessageStyle: React.CSSProperties = {
    ...messageStyle,
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success-dark)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  };

  const errorMessageStyle: React.CSSProperties = {
    ...messageStyle,
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger-dark)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-gray-50)',
    color: 'var(--color-gray-600)',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    borderBottom: '2px solid var(--color-gray-200)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-gray-100)',
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    const colors: { [key: string]: { bg: string; color: string } } = {
      ADMIN: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' },
      PLANNER: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
      WORKER: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    };
    const { bg, color } = colors[role] || colors.WORKER;
    return {
      display: 'inline-block',
      padding: '4px 10px',
      backgroundColor: bg,
      color,
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
    };
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>팀 사용자 관리</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
          >
            ➕ 사용자 초대
          </button>
        )}
      </div>

      {message && (
        <div style={message.type === 'success' ? successMessageStyle : errorMessageStyle}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {/* 초대 폼 */}
      {showForm && (
        <div style={{ ...sectionStyle, animation: 'fadeIn 0.25s ease-out' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
            새 사용자 초대
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={formStyle}>
              <input
                type="email"
                placeholder="초대할 사용자 이메일"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
                required
              />
              <input
                type="text"
                placeholder="사용자 이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                required
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={selectStyle}
              >
                <option value="WORKER">작업자 (WORKER)</option>
                <option value="PLANNER">기획자 (PLANNER)</option>
                <option value="ADMIN">관리자 (ADMIN)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="submit"
                style={submitButtonStyle}
                disabled={submitting}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
              >
                {submitting ? '초대 중...' : '초대메일 발송'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={cancelButtonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-300)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'; }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 사용자 목록 */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          팀 멤버 ({users.length}명)
        </h2>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-gray-200)' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>이메일</th>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>역할</th>
                <th style={thStyle}>상태</th>
                <th style={thStyle}>가입일</th>
                <th style={thStyle}>마지막 로그인</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, fontWeight: '500', color: 'var(--color-gray-900)' }}>{u.email}</td>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{u.name}</td>
                  <td style={tdStyle}>
                    <span style={roleBadgeStyle(u.role)}>{u.role}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      color: u.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: u.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                      }}/>
                      {u.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            가입한 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
