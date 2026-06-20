'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

interface ProjectInfo {
  project: { id: number; name: string; status: string };
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  leaveDate?: string | null;
  affiliation?: string | null;
  createdAt: string;
  lastLoginAt?: string;
  projectMembers?: ProjectInfo[];
}

interface Project {
  id: number;
  name: string;
  status: string;
}

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'WORKER',
    leaveDate: '',
    affiliation: '',
    projectIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<{ data: User[] }>('/users');
      setUsers(res.data.data);
    } catch {
      setMessage({ type: 'error', text: '사용자 목록 조회에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get<{ data: Project[] }>('/projects');
      setProjects(res.data.data.filter(p => p.status === 'ACTIVE'));
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!authLoading && currentUser?.role === 'ADMIN') {
      fetchUsers();
      fetchProjects();
    }
  }, [authLoading, currentUser]);

  const resetForm = () => setFormData({ email: '', name: '', role: 'WORKER', leaveDate: '', affiliation: '', projectIds: [] });

  const openCreateForm = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (u: User) => {
    setEditingUser(u);
    setFormData({
      email: u.email,
      name: u.name,
      role: u.role,
      leaveDate: u.leaveDate ? u.leaveDate.slice(0, 10) : '',
      affiliation: u.affiliation || '',
      projectIds: u.projectMembers?.map(pm => pm.project.id) || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        leaveDate: formData.leaveDate || null,
        affiliation: formData.affiliation || null,
        projectIds: formData.projectIds,
      };

      if (editingUser) {
        await apiClient.patch(`/users/${editingUser.id}`, payload);
        setMessage({ type: 'success', text: '사용자 정보가 수정되었습니다.' });
      } else {
        const res = await apiClient.post<{ data: { tempPassword: string } }>('/users', {
          email: formData.email,
          ...payload,
        });
        const tempPw = res.data.data?.tempPassword;
        setMessage({ type: 'success', text: `생성 완료. 임시 비밀번호: ${tempPw}` });
      }

      setShowForm(false);
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '처리 실패' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('비활성화하시겠습니까?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '비활성화 실패' });
    }
  };

  const toggleProject = (id: number) => {
    setFormData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(id)
        ? prev.projectIds.filter(p => p !== id)
        : [...prev.projectIds, id],
    }));
  };

  const roleLabel = (role: string) => role === 'ADMIN' ? '최고관리자' : role === 'MANAGER' ? '관리자' : '작업자';
  const roleBadgeColor = (role: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      ADMIN: { bg: '#FEE2E2', color: '#991B1B' },
      MANAGER: { bg: '#FEF3C7', color: '#92400E' },
      WORKER: { bg: '#DBEAFE', color: '#0C2D6B' },
    };
    const c = map[role] || map.WORKER;
    return { display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, backgroundColor: c.bg, color: c.color };
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--border)',
    borderRadius: 7, boxSizing: 'border-box', fontFamily: 'inherit',
    backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  if (authLoading || loading) {
    return <div style={{ padding: 40 }}>로딩 중...</div>;
  }

  if (currentUser?.role !== 'ADMIN') {
    return <div style={{ padding: 40 }}>관리자만 접근 가능합니다.</div>;
  }

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>사용자 관리</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>팀 멤버를 생성하고 관리합니다.</p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + 사용자 생성
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13,
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${message.type === 'success' ? '#D1FAE5' : '#FECACA'}`,
          }}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
              {editingUser ? '사용자 수정' : '새 사용자 생성'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                {!editingUser && (
                  <div>
                    <label style={labelStyle}>이메일 *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required style={inputStyle} placeholder="name@company.com" />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>이름 *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required style={inputStyle} placeholder="홍길동" />
                </div>
                <div>
                  <label style={labelStyle}>역할 *</label>
                  <select value={formData.role} onChange={e => {
                    const role = e.target.value;
                    setFormData(p => ({ ...p, role, projectIds: role === 'ADMIN' ? [] : p.projectIds }));
                  }} style={inputStyle}>
                    <option value="WORKER">작업자</option>
                    <option value="MANAGER">관리자</option>
                    <option value="ADMIN">최고관리자</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>소속</label>
                  <select value={formData.affiliation} onChange={e => setFormData(p => ({ ...p, affiliation: e.target.value }))} style={inputStyle}>
                    <option value="">선택 안함</option>
                    <option value="정규">정규</option>
                    <option value="프리">프리</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>철수일</label>
                  <input type="date" value={formData.leaveDate} onChange={e => setFormData(p => ({ ...p, leaveDate: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {projects.length > 0 && (
                <div style={{ marginBottom: 20, opacity: formData.role === 'ADMIN' ? 0.4 : 1, pointerEvents: formData.role === 'ADMIN' ? 'none' : 'auto' }}>
                  <label style={labelStyle}>소속 프로젝트 {formData.role === 'ADMIN' && <span style={{ fontWeight: 400, textTransform: 'none' }}>(최고관리자는 선택 불필요)</span>}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {projects.map(p => {
                      const selected = formData.projectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProject(p.id)}
                          style={{
                            padding: '5px 12px', fontSize: 12, fontWeight: 600,
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 5, cursor: 'pointer',
                            backgroundColor: selected ? 'var(--accent-light)' : 'var(--bg-subtle)',
                            color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting} style={{ padding: '8px 20px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {submitting ? '저장 중...' : (editingUser ? '수정' : '생성')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['이름', '이메일', '역할', '소속', '상태', '철수일', '소속 프로젝트', '가입일', ''].map(h => (
                    <th key={h} style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 14px' }}><span style={roleBadgeColor(u.role)}>{roleLabel(u.role)}</span></td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.affiliation || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: u.isActive ? '#059669' : '#DC2626', fontWeight: 600, fontSize: 12 }}>
                        {u.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {u.leaveDate ? new Date(u.leaveDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.projectMembers?.filter(pm => pm.project.status === 'ACTIVE').map(pm => (
                          <span key={pm.project.id} style={{ padding: '2px 7px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {pm.project.name}
                          </span>
                        ))}
                        {(!u.projectMembers || u.projectMembers.filter(pm => pm.project.status === 'ACTIVE').length === 0) && (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditForm(u)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}>
                          수정
                        </button>
                        {u.isActive && u.id !== Number(currentUser?.id) && (
                          <button onClick={() => handleDeactivate(u.id)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid #FECACA', borderRadius: 5, cursor: 'pointer' }}>
                            비활성화
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>등록된 사용자가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
