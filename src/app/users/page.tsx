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
  };

  if (authLoading || loading) {
    return <div style={containerStyle}>로딩 중...</div>;
  }

  if (currentUser?.role !== 'ADMIN') {
    return <div style={containerStyle}>관리자만 접근 가능합니다.</div>;
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
  };

  const buttonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--space-6)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    marginBottom: 'var(--space-6)',
  };

  const formStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
  };

  const inputStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
  };

  const submitButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--accent)',
  };

  const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  };

  const messageStyle: React.CSSProperties = {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: '6px',
    marginBottom: 'var(--space-4)',
    fontSize: '14px',
    fontWeight: '500',
  };

  const successMessageStyle: React.CSSProperties = {
    ...messageStyle,
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #D1FAE5',
  };

  const errorMessageStyle: React.CSSProperties = {
    ...messageStyle,
    backgroundColor: '#FEF2F2',
    color: '#7F1D1D',
    border: '1px solid #FEDEDE',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    padding: 'var(--space-2) var(--space-3)',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    borderBottom: '1px solid var(--color-gray-100)',
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    const colors: { [key: string]: { bg: string; color: string } } = {
      ADMIN: { bg: '#FEE2E2', color: '#991B1B' },
      PLANNER: { bg: '#FEF3C7', color: '#92400E' },
      WORKER: { bg: '#DBEAFE', color: '#0C2D6B' },
    };
    const { bg, color } = colors[role] || colors.WORKER;
    return {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: bg,
      color,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
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
          >
            ➕ 사용자 초대
          </button>
        )}
      </div>

      {message && (
        <div style={message.type === 'success' ? successMessageStyle : errorMessageStyle}>
          {message.text}
        </div>
      )}

      {/* 초대 폼 */}
      {showForm && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
            새 사용자 초대
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={formStyle}>
              <input
                type="email"
                placeholder="이메일"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
                required
              />
              <input
                type="text"
                placeholder="이름"
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
              >
                {submitting ? '초대 중...' : '초대하기'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={cancelButtonStyle}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 사용자 목록 */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          팀 멤버 ({users.length}명)
        </h2>
        <div style={{ overflowX: 'auto' }}>
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
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>
                    <span style={roleBadgeStyle(u.role)}>{u.role}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: u.isActive ? '#059669' : '#DC2626', fontWeight: '600' }}>
                      {u.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={tdStyle}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td style={tdStyle}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            초대된 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
