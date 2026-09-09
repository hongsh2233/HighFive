'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './projects.module.css';
import Spinner from '@/components/common/Spinner';
import { useDialog } from '@/components/common/DialogProvider';

interface ProjectMember {
  user: { id: number; name: string; email: string; role: string };
}

interface ProjectRole {
  id: number;
  label: string;
  userId: number | null;
  userName: string | null;
  user: { id: number; name: string } | null;
}

interface Project {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  creator: { id: number; name: string };
  projectManagerName?: string | null;
  projectLeadName?: string | null;
  wikiEnabled: boolean;
  simpleMode: boolean;
  customLabels?: string | null;
  roles: ProjectRole[];
  members: ProjectMember[];
  _count: { tasks: number };
  createdAt: string;
}

interface RoleDraft { label: string; userId: string; userName: string; }

const ROLE_PRESETS = ['PL', '기획리더', '디자인리더', '퍼블리싱리더', '개발리더', '시장조사리더'];

const emptyForm = {
  name: '',
  description: '',
  projectManagerName: '',
  wikiEnabled: true,
  simpleMode: false,
  customLabels: '',
  roles: [] as RoleDraft[],
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const canManage = ['ADMIN', 'LEADER'].includes(user?.role || '');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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
      description: p.description || '',
      projectManagerName: p.projectManagerName || '',
      wikiEnabled: p.wikiEnabled,
      simpleMode: p.simpleMode,
      customLabels: p.customLabels || '',
      roles: (p.roles || []).map(r => ({
        label: r.label,
        userId: r.userId ? String(r.userId) : '',
        userName: r.userName || '',
      })),
    });
    setShowForm(true);
  };

  const addRole = () => {
    setForm(p => ({ ...p, roles: [...p.roles, { label: '', userId: '', userName: '' }] }));
  };
  const removeRole = (idx: number) => {
    setForm(p => ({ ...p, roles: p.roles.filter((_, i) => i !== idx) }));
  };
  const updateRole = (idx: number, patch: Partial<RoleDraft>) => {
    setForm(p => ({ ...p, roles: p.roles.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        projectManagerName: form.projectManagerName.trim() || null,
        wikiEnabled: form.wikiEnabled,
        simpleMode: form.simpleMode,
        customLabels: form.customLabels.trim() || null,
        roles: form.simpleMode ? [] : form.roles
          .filter(r => r.label.trim())
          .map(r => ({
            label: r.label.trim(),
            userId: r.userId ? Number(r.userId) : undefined,
            userName: r.userName.trim() || undefined,
          })),
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
    if (!(await confirm('프로젝트를 종료하시겠습니까?'))) return;
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'CLOSED' });
      setMessage({ type: 'success', text: '프로젝트가 종료되었습니다.' });
      await fetchProjects();
    } catch { setMessage({ type: 'error', text: '종료 실패' }); }
  };

  const handleReopen = async (projectId: number) => {
    try {
      await apiClient.patch(`/projects/${projectId}`, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: '재개되었습니다.' });
      await fetchProjects();
    } catch { setMessage({ type: 'error', text: '재개 실패' }); }
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


  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>프로젝트 관리</h1>
            <p className={styles.pageSubtitle}>프로젝트를 생성하고 멤버를 관리합니다.</p>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
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
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.wikiEnabled}
                    onChange={e => setForm(p => ({ ...p, wikiEnabled: e.target.checked }))}
                  />
                  위키 사용
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.simpleMode}
                    onChange={e => setForm(p => ({ ...p, simpleMode: e.target.checked }))}
                  />
                  간편모드 (개요·역할 설정 생략)
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>업무 라벨 <span style={{ textTransform: 'none', fontWeight: 400 }}>(쉼표로 구분, 비워두면 기본 라벨 사용)</span></label>
                <input
                  value={form.customLabels}
                  onChange={e => setForm(p => ({ ...p, customLabels: e.target.value }))}
                  placeholder="예: 긴급, 주말대응, VIP고객, 재작업"
                  style={inputStyle}
                />
              </div>

              {!form.simpleMode && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>프로젝트 개요</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="이 프로젝트가 어떤 프로젝트인지 설명해주세요. (예: IT 시스템 구축, 마케팅 캠페인 등)"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>역할 (선택)</label>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      예시: {ROLE_PRESETS.join(' / ')} — 아래 "역할 추가"로 원하는 역할명을 직접 입력하세요.
                    </div>
                    {form.roles.map((role, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <input
                          value={role.label}
                          onChange={e => updateRole(idx, { label: e.target.value })}
                          placeholder="역할명 (예: 기획리더)"
                          style={inputStyle}
                        />
                        <select
                          value={role.userId}
                          onChange={e => updateRole(idx, { userId: e.target.value, userName: '' })}
                          style={inputStyle}
                        >
                          <option value="">팀원에서 선택...</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          value={role.userName}
                          onChange={e => updateRole(idx, { userName: e.target.value, userId: '' })}
                          placeholder="이름 직접 입력"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => removeRole(idx)}
                          style={{ padding: '6px 10px', fontSize: 12, backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRole()}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}
                    >
                      + 역할 추가
                    </button>
                  </div>
                </>
              )}

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

        <div className={styles.layout}>
          {/* 프로젝트 목록 */}
          <div>
            {loading ? (
              <div className={styles.loadingState}><Spinner /></div>
            ) : projects.length === 0 ? (
              <div className={styles.emptyState}>등록된 프로젝트가 없습니다.</div>
            ) : (
              <div className={styles.projectList}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', transition: 'border-color 0.15s' }}
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
                    {p.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{p.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      {p.projectManagerName && <span>PM: <strong style={{ color: 'var(--text-secondary)' }}>{p.projectManagerName}</strong></span>}
                      {(p.roles || []).map(r => (
                        <span key={r.id}>{r.label}: <strong style={{ color: 'var(--text-secondary)' }}>{r.user?.name || r.userName || '-'}</strong></span>
                      ))}
                      {p.simpleMode && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>간편모드</span>}
                      <span>멤버 {p.members.length}명</span>
                      <span>업무 {p._count.tasks}건</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
