'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

interface ProjectMember {
  user: { id: number; name: string; email: string; role: string };
}

interface Project {
  id: number;
  name: string;
  status: string;
  creator: { id: number; name: string };
  projectManagerName?: string | null;
  projectLeadName?: string | null;
  members: ProjectMember[];
  _count: { tasks: number };
  createdAt: string;
}


const emptyForm = { name: '', projectManagerName: '', projectLeadName: '' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  type AllUser = { id: number; name: string; email: string; role: string };
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get<{ data: Project[] }>('/projects');
      setProjects(res.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '목록 조회 실패' });
    } finally { setLoading(false); }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await apiClient.get<{ data: AllUser[] }>('/users');
      setAllUsers(res.data.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchProjects();
    fetchAllUsers();
  }, []);

  const openCreateForm = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(p);
    setForm({
      name: p.name,
      projectManagerName: p.projectManagerName || '',
      projectLeadName: p.projectLeadName || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        projectManagerName: form.projectManagerName.trim() || null,
        projectLeadName: form.projectLeadName.trim() || null,
      };

      if (editingProject) {
        await apiClient.patch(`/projects/${editingProject.id}`, payload);
        setMessage({ type: 'success', text: '수정되었습니다.' });
      } else {
        await apiClient.post('/projects', payload);
        setMessage({ type: 'success', text: '프로젝트가 생성되었습니다.' });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingProject(null);
      await fetchProjects();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || '저장 실패' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (projectId: number) => {
    if (!confirm('프로젝트를 종료하시겠습니까?')) return;
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'CLOSED' });
      setMessage({ type: 'success', text: '프로젝트가 종료되었습니다.' });
      await fetchProjects();
      if (selectedProject?.id === projectId) setSelectedProject(p => p ? { ...p, status: 'CLOSED' } : null);
    } catch { setMessage({ type: 'error', text: '종료 실패' }); }
  };

  const handleReopen = async (projectId: number) => {
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: '재개되었습니다.' });
      await fetchProjects();
    } catch { setMessage({ type: 'error', text: '재개 실패' }); }
  };

  const handleAddMember = async (projectId: number, userId: number) => {
    try {
      await apiClient.post(`/projects/${projectId}/members`, { userId });
      const res = await apiClient.get<{ data: Project }>(`/projects/${projectId}`);
      setSelectedProject(res.data.data);
      await fetchProjects();
    } catch { setMessage({ type: 'error', text: '멤버 추가 실패' }); }
  };

  const handleRemoveMember = async (projectId: number, userId: number) => {
    try {
      await apiClient.delete(`/projects/${projectId}/members?userId=${userId}`);
      const res = await apiClient.get<{ data: Project }>(`/projects/${projectId}`);
      setSelectedProject(res.data.data);
      await fetchProjects();
    } catch { setMessage({ type: 'error', text: '멤버 제거 실패' }); }
  };

  const handleSelectProject = async (project: Project) => {
    if (selectedProject?.id === project.id) { setSelectedProject(null); return; }
    const res = await apiClient.get<{ data: Project }>(`/projects/${project.id}`);
    setSelectedProject(res.data.data);
  };

  const statusBadge = (status: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
    backgroundColor: status === 'ACTIVE' ? '#DCFCE7' : '#F4F4F5',
    color: status === 'ACTIVE' ? '#166534' : '#71717A',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1px solid var(--border)', borderRadius: 7,
    fontFamily: 'inherit', outline: 'none',
    backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const memberIds = new Set(selectedProject?.members.map(m => m.user.id) || []);
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>프로젝트 관리</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>프로젝트를 생성하고 멤버를 관리합니다.</p>
          </div>
          {canManage && !showForm && (
            <button onClick={openCreateForm} style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + 프로젝트 생성
            </button>
          )}
        </div>

        {message && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: message.type === 'success' ? '#065F46' : '#991B1B', border: `1px solid ${message.type === 'success' ? '#D1FAE5' : '#FECACA'}` }}>
            {message.text}
          </div>
        )}

        {/* 생성/수정 폼 */}
        {showForm && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
              {editingProject ? '프로젝트 수정' : '새 프로젝트 생성'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>프로젝트 이름 *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="프로젝트 이름"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>PM (Project Manager)</label>
                  <select
                    onChange={e => { if (e.target.value) setForm(p => ({ ...p, projectManagerName: e.target.value })); }}
                    style={{ ...inputStyle, marginBottom: 6 }}
                  >
                    <option value="">팀원에서 선택...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <input
                    value={form.projectManagerName}
                    onChange={e => setForm(p => ({ ...p, projectManagerName: e.target.value }))}
                    placeholder="이름 직접 입력"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>PL (Project Lead)</label>
                  <select
                    onChange={e => { if (e.target.value) setForm(p => ({ ...p, projectLeadName: e.target.value })); }}
                    style={{ ...inputStyle, marginBottom: 6 }}
                  >
                    <option value="">팀원에서 선택...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <input
                    value={form.projectLeadName}
                    onChange={e => setForm(p => ({ ...p, projectLeadName: e.target.value }))}
                    placeholder="이름 직접 입력"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting} style={{ padding: '8px 20px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {submitting ? '저장 중...' : (editingProject ? '수정' : '생성')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingProject(null); setForm(emptyForm); }} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selectedProject ? '1fr 360px' : '1fr', gap: 24 }}>
          {/* 프로젝트 목록 */}
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>로딩 중...</div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                등록된 프로젝트가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${selectedProject?.id === p.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{p.name}</span>
                      <span style={statusBadge(p.status)}>{p.status === 'ACTIVE' ? '진행중' : '종료'}</span>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button onClick={e => openEditForm(p, e)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}>
                            수정
                          </button>
                          {p.status === 'ACTIVE' ? (
                            <button onClick={e => { e.stopPropagation(); handleClose(p.id); }} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid #FECACA', borderRadius: 5, cursor: 'pointer' }}>
                              종료
                            </button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); handleReopen(p.id); }} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}>
                              재개
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.projectManagerName && <span>PM: <strong style={{ color: 'var(--text-secondary)' }}>{p.projectManagerName}</strong></span>}
                      {p.projectLeadName && <span>PL: <strong style={{ color: 'var(--text-secondary)' }}>{p.projectLeadName}</strong></span>}
                      <span>멤버 {p.members.length}명</span>
                      <span>업무 {p._count.tasks}건</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 멤버 패널 */}
          {selectedProject && (
            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, alignSelf: 'start', position: 'sticky', top: 68 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedProject.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>멤버 {selectedProject.members.length}명</div>
                </div>
                <button onClick={() => setSelectedProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {selectedProject.members.map(m => (
                  <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 7 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {m.user.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.user.role === 'ADMIN' ? '최고관리자' : m.user.role === 'MANAGER' ? '관리자' : '작업자'}</div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleRemoveMember(selectedProject.id, m.user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 4 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && nonMembers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>멤버 추가</div>
                  <select
                    onChange={e => { if (e.target.value) handleAddMember(selectedProject.id, parseInt(e.target.value)); e.target.value = ''; }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 7, fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  >
                    <option value="">사용자 선택...</option>
                    {nonMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role === 'MANAGER' ? '관리자' : '작업자'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
