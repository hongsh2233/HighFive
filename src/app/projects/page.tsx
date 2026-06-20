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
  members: ProjectMember[];
  _count: { tasks: number };
  createdAt: string;
}

interface AllUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get<{ data: Project[] }>('/projects');
      setProjects(res.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await apiClient.get<{ data: AllUser[] }>('/users');
      setAllUsers(res.data.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchProjects();
    if (isAdmin) fetchAllUsers();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post('/projects', { name: newProjectName.trim() });
      setNewProjectName('');
      setShowCreateForm(false);
      setMessage({ type: 'success', text: '프로젝트가 생성되었습니다.' });
      await fetchProjects();
    } catch {
      setMessage({ type: 'error', text: '생성 실패' });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (projectId: number) => {
    if (!confirm('프로젝트를 종료하시겠습니까?')) return;
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'CLOSED' });
      setMessage({ type: 'success', text: '프로젝트가 종료되었습니다.' });
      await fetchProjects();
      if (selectedProject?.id === projectId) {
        setSelectedProject(p => p ? { ...p, status: 'CLOSED' } : null);
      }
    } catch {
      setMessage({ type: 'error', text: '종료 실패' });
    }
  };

  const handleReopen = async (projectId: number) => {
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: '프로젝트가 재개되었습니다.' });
      await fetchProjects();
    } catch {
      setMessage({ type: 'error', text: '재개 실패' });
    }
  };

  const handleAddMember = async (projectId: number, userId: number) => {
    try {
      await apiClient.post(`/projects/${projectId}/members`, { userId });
      const res = await apiClient.get<{ data: Project }>(`/projects/${projectId}`);
      setSelectedProject(res.data.data);
      await fetchProjects();
    } catch {
      setMessage({ type: 'error', text: '멤버 추가 실패' });
    }
  };

  const handleRemoveMember = async (projectId: number, userId: number) => {
    try {
      await apiClient.delete(`/projects/${projectId}/members?userId=${userId}`);
      const res = await apiClient.get<{ data: Project }>(`/projects/${projectId}`);
      setSelectedProject(res.data.data);
      await fetchProjects();
    } catch {
      setMessage({ type: 'error', text: '멤버 제거 실패' });
    }
  };

  const handleSelectProject = async (project: Project) => {
    const res = await apiClient.get<{ data: Project }>(`/projects/${project.id}`);
    setSelectedProject(res.data.data);
  };

  const statusBadge = (status: string) => ({
    display: 'inline-block' as const,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: status === 'ACTIVE' ? '#DCFCE7' : '#F4F4F5',
    color: status === 'ACTIVE' ? '#166534' : '#71717A',
  });

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
          {canManage && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              + 프로젝트 생성
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

        {showCreateForm && (
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="프로젝트 이름"
              required
              style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }}
            />
            <button type="submit" disabled={creating} style={{ padding: '9px 20px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {creating ? '생성 중...' : '생성'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} style={{ padding: '9px 14px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              취소
            </button>
          </form>
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
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: `1px solid ${selectedProject?.id === p.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                        <span style={statusBadge(p.status)}>{p.status === 'ACTIVE' ? '진행중' : '종료'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        멤버 {p.members.length}명 · 업무 {p._count.tasks}건 · 생성: {p.creator.name}
                      </div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                        {p.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleClose(p.id)}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid #FECACA', borderRadius: 5, cursor: 'pointer' }}
                          >
                            종료
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReopen(p.id)}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}
                          >
                            재개
                          </button>
                        )}
                      </div>
                    )}
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

              {/* 멤버 목록 */}
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
                      <button
                        onClick={() => handleRemoveMember(selectedProject.id, m.user.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 4 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 멤버 추가 */}
              {isAdmin && nonMembers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>멤버 추가</div>
                  <select
                    onChange={e => {
                      if (e.target.value) handleAddMember(selectedProject.id, parseInt(e.target.value));
                      e.target.value = '';
                    }}
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
