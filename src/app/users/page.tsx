'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/common/Modal';
import styles from './users.module.css';

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
  managerId?: number | null;
  manager?: { id: number; name: string } | null;
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
    managerId: '',
    projectIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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

  const resetForm = () => setFormData({ email: '', name: '', role: 'WORKER', leaveDate: '', affiliation: '', managerId: '', projectIds: [] });

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
      managerId: u.managerId ? String(u.managerId) : '',
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
        managerId: formData.managerId || null,
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
        if (tempPw) setTempPassword(tempPw);
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

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 팀원을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) return;
    try {
      await apiClient.delete(`/users/${id}?hard=true`);
      setMessage({ type: 'success', text: '삭제되었습니다.' });
      await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '삭제 실패' });
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

  const roleLabel = (role: string) => role === 'ADMIN' ? '최고관리자' : role === 'LEADER' ? '리더' : '작업자';

  const leaderCandidates = users.filter(u => ['ADMIN', 'LEADER'].includes(u.role) && u.id !== editingUser?.id);

  if (authLoading || loading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  if (currentUser?.role !== 'ADMIN') {
    return <div className={styles.loadingPage}>관리자만 접근 가능합니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>팀원 관리</h1>
            <p className={styles.pageSubtitle}>팀원을 추가하고 관리합니다.</p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} className={styles.btnPrimary}>
              + 팀원 추가
            </button>
          )}
        </div>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              {editingUser ? '팀원 수정' : '새 팀원 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                {!editingUser && (
                  <div>
                    <label className={styles.label}>이메일 *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required className={styles.input} placeholder="name@company.com" />
                  </div>
                )}
                <div>
                  <label className={styles.label}>이름 *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required className={styles.input} placeholder="홍길동" />
                </div>
                <div>
                  <label className={styles.label}>역할 *</label>
                  <select value={formData.role} onChange={e => {
                    const role = e.target.value;
                    setFormData(p => ({ ...p, role, projectIds: role === 'ADMIN' ? [] : p.projectIds }));
                  }} className={styles.input}>
                    <option value="WORKER">작업자</option>
                    <option value="LEADER">리더</option>
                    <option value="ADMIN">최고관리자</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>소속</label>
                  <select value={formData.affiliation} onChange={e => setFormData(p => ({ ...p, affiliation: e.target.value }))} className={styles.input}>
                    <option value="">선택 안함</option>
                    <option value="정규">정규</option>
                    <option value="프리">프리</option>
                    <option value="협력사">협력사</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>철수일</label>
                  <input type="date" value={formData.leaveDate} onChange={e => setFormData(p => ({ ...p, leaveDate: e.target.value }))} className={styles.input} />
                </div>
                <div>
                  <label className={styles.label}>담당 리더</label>
                  <select value={formData.managerId} onChange={e => setFormData(p => ({ ...p, managerId: e.target.value }))} className={styles.input}>
                    <option value="">지정 안함</option>
                    {leaderCandidates.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>
                    ))}
                  </select>
                </div>
              </div>

              {projects.length > 0 && (
                <div className={styles.projectSection} data-disabled={formData.role === 'ADMIN' ? 'true' : 'false'}>
                  <label className={styles.label}>소속 프로젝트 {formData.role === 'ADMIN' && <span className={styles.labelNote}>(최고관리자는 선택 불필요)</span>}</label>
                  <div className={styles.projectCheckList}>
                    {projects.map(p => {
                      const selected = formData.projectIds.includes(p.id);
                      return (
                        <label key={p.id} className={styles.projectCheckItem} data-checked={selected ? 'true' : 'false'}>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={formData.role === 'ADMIN'}
                            onChange={() => toggleProject(p.id)}
                            className={styles.projectCheckbox}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                  {submitting ? '저장 중...' : (editingUser ? '수정' : '추가')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className={styles.btnCancel}>
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['이름', '이메일', '역할', '소속', '담당 리더', '상태', '철수일', '소속 프로젝트', '가입일', ''].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.tdName}>{u.name}</td>
                    <td className={styles.tdSecondary}>{u.email}</td>
                    <td className={styles.td}>
                      <span className={styles.roleBadge} data-role={u.role}>{roleLabel(u.role)}</span>
                    </td>
                    <td className={styles.tdSecondary}>{u.affiliation || '-'}</td>
                    <td className={styles.tdSecondary}>{u.manager?.name || '-'}</td>
                    <td className={styles.td}>
                      <span className={u.isActive ? styles.statusActive : styles.statusInactive} data-active={u.isActive ? 'true' : 'false'}>
                        {u.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className={styles.tdSecondary}>
                      {u.leaveDate ? new Date(u.leaveDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.projectTagRow}>
                        {u.projectMembers?.filter(pm => pm.project.status === 'ACTIVE').map(pm => (
                          <span key={pm.project.id} className={styles.projectTag}>
                            {pm.project.name}
                          </span>
                        ))}
                        {(!u.projectMembers || u.projectMembers.filter(pm => pm.project.status === 'ACTIVE').length === 0) && (
                          <span className={styles.tagEmpty}>-</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.tdSecondary}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button onClick={() => openEditForm(u)} className={styles.btnEdit}>
                          수정
                        </button>
                        {u.isActive && u.id !== Number(currentUser?.id) && (
                          <button onClick={() => handleDeactivate(u.id)} className={styles.btnDeactivate}>
                            비활성화
                          </button>
                        )}
                        {(currentUser as any)?.email === 'admin@admin.co.kr' && u.id !== Number(currentUser?.id) && (
                          <button onClick={() => handleDelete(u.id, u.name)} className={styles.btnDelete}>
                            삭제
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
            <div className={styles.emptyState}>등록된 팀원이 없습니다.</div>
          )}
        </div>
      </div>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="팀원 생성 완료">
        <div className={styles.tempPwBody}>
          <p className={styles.tempPwDesc}>임시 비밀번호가 생성되었습니다. 팀원에게 안전하게 전달해주세요.</p>
          <div className={styles.tempPwBox}>
            <code className={styles.tempPwCode}>{tempPassword}</code>
            <button
              type="button"
              className={styles.tempPwCopyBtn}
              onClick={() => {
                if (tempPassword) navigator.clipboard.writeText(tempPassword);
              }}
            >
              복사
            </button>
          </div>
          <button type="button" className={styles.btnSubmit} onClick={() => setTempPassword(null)}>
            확인
          </button>
        </div>
      </Modal>
    </div>
  );
}
