'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './projects.module.css';

interface ProjectMember {
  user: { id: number; name: string; email: string; role: string };
}

interface Project {
  id: number;
  name: string;
  status: string;
  creator: { id: number; name: string };
  projectManager?: { id: number; name: string } | null;
  projectLeadName?: string | null;
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

const emptyForm = { name: '', projectManagerId: '', projectLeadName: '' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
    } catch { /* silent */ } finally { setLoading(false); }
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
      projectManagerId: p.projectManager ? String(p.projectManager.id) : '',
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
        projectManagerId: form.projectManagerId ? parseInt(form.projectManagerId) : null,
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

  const memberIds = new Set(selectedProject?.members.map(m => m.user.id) || []);
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>프로젝트 관리</h1>
            <p className={styles.pageSubtitle}>프로젝트를 생성하고 멤버를 관리합니다.</p>
          </div>
          {canManage && !showForm && (
            <button onClick={openCreateForm} className={styles.createBtn}>
              + 프로젝트 생성
            </button>
          )}
        </div>

        {message && (
          <div className={styles.message} data-type={message.type}>
            {message.text}
          </div>
        )}

        {/* 생성/수정 폼 */}
        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formCardTitle}>
              {editingProject ? '프로젝트 수정' : '새 프로젝트 생성'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.formLabel}>프로젝트 이름 *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="프로젝트 이름"
                    required
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>PM (Project Manager)</label>
                  <select
                    value={form.projectManagerId}
                    onChange={e => setForm(p => ({ ...p, projectManagerId: e.target.value }))}
                    className={styles.input}
                  >
                    <option value="">선택 안함</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role === 'MANAGER' ? '관리자' : u.role === 'ADMIN' ? '최고관리자' : '작업자'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.formLabel}>PL (Project Lead)</label>
                  <input
                    value={form.projectLeadName}
                    onChange={e => setForm(p => ({ ...p, projectLeadName: e.target.value }))}
                    placeholder="이름 직접 입력 (외부 인력 가능)"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.submitBtn}>
                  {submitting ? '저장 중...' : (editingProject ? '수정' : '생성')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingProject(null); setForm(emptyForm); }} className={styles.cancelBtn}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={`${styles.layout} ${selectedProject ? styles.layoutWithPanel : ''}`}>
          {/* 프로젝트 목록 */}
          <div>
            {loading ? (
              <div className={styles.loadingState}>로딩 중...</div>
            ) : projects.length === 0 ? (
              <div className={styles.emptyState}>등록된 프로젝트가 없습니다.</div>
            ) : (
              <div className={styles.projectList}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    data-selected={selectedProject?.id === p.id}
                    className={styles.projectCard}
                  >
                    <div className={styles.projectCardTop}>
                      <span className={styles.projectName}>{p.name}</span>
                      <span className={p.status === 'ACTIVE' ? styles.statusBadgeActive : styles.statusBadgeClosed}>
                        {p.status === 'ACTIVE' ? '진행중' : '종료'}
                      </span>
                      {canManage && (
                        <div className={styles.projectCardActions} onClick={e => e.stopPropagation()}>
                          <button onClick={e => openEditForm(p, e)} className={styles.editBtn}>수정</button>
                          {p.status === 'ACTIVE' ? (
                            <button onClick={e => { e.stopPropagation(); handleClose(p.id); }} className={styles.closeBtn}>종료</button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); handleReopen(p.id); }} className={styles.reopenBtn}>재개</button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={styles.projectMeta}>
                      {p.projectManager && <span>PM: <strong className={styles.metaStrong}>{p.projectManager.name}</strong></span>}
                      {p.projectLeadName && <span>PL: <strong className={styles.metaStrong}>{p.projectLeadName}</strong></span>}
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
            <div className={styles.memberPanel}>
              <div className={styles.memberPanelHeader}>
                <div>
                  <div className={styles.memberPanelTitle}>{selectedProject.name}</div>
                  <div className={styles.memberPanelCount}>멤버 {selectedProject.members.length}명</div>
                </div>
                <button onClick={() => setSelectedProject(null)} className={styles.memberPanelClose}>✕</button>
              </div>

              <div className={styles.memberList}>
                {selectedProject.members.map(m => (
                  <div key={m.user.id} className={styles.memberItem}>
                    <div className={styles.memberAvatar}>{m.user.name[0]}</div>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{m.user.name}</div>
                      <div className={styles.memberRole}>{m.user.role === 'ADMIN' ? '최고관리자' : m.user.role === 'MANAGER' ? '관리자' : '작업자'}</div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleRemoveMember(selectedProject.id, m.user.id)} className={styles.memberRemoveBtn}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && nonMembers.length > 0 && (
                <div>
                  <div className={styles.addMemberLabel}>멤버 추가</div>
                  <select
                    onChange={e => { if (e.target.value) handleAddMember(selectedProject.id, parseInt(e.target.value)); e.target.value = ''; }}
                    className={styles.addMemberSelect}
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
