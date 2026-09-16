'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/common/Modal';
import { useDialog } from '@/components/common/DialogProvider';
import styles from './users.module.css';
import Spinner from '@/components/common/Spinner';

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
  orgUnit?: string | null;
  createdAt: string;
  lastLoginAt?: string;
  managerId?: number | null;
  manager?: { id: number; name: string } | null;
  projectMembers?: ProjectInfo[];
  resumeFilename?: string | null;
  canManageExpense?: boolean;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { confirm } = useDialog();
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
    orgUnit: '',
    canManageExpense: false,
    projectIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'orgchart'>('list');

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

  const resetForm = () => setFormData({ email: '', name: '', role: 'WORKER', leaveDate: '', affiliation: '', managerId: '', orgUnit: '', canManageExpense: false, projectIds: [] });

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
      orgUnit: u.orgUnit || '',
      canManageExpense: !!(u as any).canManageExpense,
      projectIds: u.projectMembers?.map(pm => pm.project.id) || [],
    });
    setShowForm(true);
  };

  const handleResumeUpload = async (file: File | undefined) => {
    if (!file || !editingUser) return;
    setResumeError('');
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('이력서 파일은 5MB를 초과할 수 없습니다.');
      return;
    }
    setResumeUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiClient.post(`/users/${editingUser.id}/resume`, { filename: file.name, mimeType: file.type, dataBase64 });
      setEditingUser(prev => prev ? { ...prev, resumeFilename: file.name } : prev);
      await fetchUsers();
    } catch (err: any) {
      setResumeError(err?.response?.data?.message || '이력서 업로드 중 오류가 발생했습니다.');
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!editingUser) return;
    const ok = await confirm('이력서를 삭제하시겠습니까?');
    if (!ok) return;
    try {
      await apiClient.delete(`/users/${editingUser.id}/resume`);
      setEditingUser(prev => prev ? { ...prev, resumeFilename: null } : prev);
      await fetchUsers();
    } catch {
      setResumeError('이력서 삭제 중 오류가 발생했습니다.');
    }
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
        orgUnit: formData.orgUnit || null,
        canManageExpense: formData.canManageExpense,
        projectIds: formData.projectIds,
      };

      if (editingUser) {
        await apiClient.patch(`/users/${editingUser.id}`, { ...payload, email: formData.email });
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
    if (!(await confirm('비활성화하시겠습니까?'))) return;
    try {
      await apiClient.delete(`/users/${id}`);
      await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '비활성화 실패' });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!(await confirm(`"${name}" 팀원을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`))) return;
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
    return <div className={styles.loadingPage}><Spinner /></div>;
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)' }}
              >
                목록으로 보기
              </button>
              <button
                type="button"
                onClick={() => setViewMode('orgchart')}
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'orgchart' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'orgchart' ? '#fff' : 'var(--text-secondary)' }}
              >
                조직도로 보기
              </button>
            </div>
            {!showForm && (
              <button onClick={openCreateForm} className={styles.btnPrimary}>
                + 팀원 추가
              </button>
            )}
          </div>
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
                <div>
                  <label className={styles.label}>이메일 *</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required className={styles.input} placeholder="name@company.com" />
                </div>
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
                  <label className={styles.label}>팀 리더</label>
                  <select value={formData.managerId} onChange={e => setFormData(p => ({ ...p, managerId: e.target.value }))} className={styles.input}>
                    <option value="">지정 안함</option>
                    {leaderCandidates.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>소속 그룹 <span className={styles.labelNote}>(직군/프로젝트팀 등 자유 입력)</span></label>
                  <input type="text" value={formData.orgUnit} onChange={e => setFormData(p => ({ ...p, orgUnit: e.target.value }))} className={styles.input} placeholder="예: 개발팀, 디자인 직군" />
                </div>
              </div>

              {formData.role === 'WORKER' && (
                <div className={styles.resumeSection}>
                  <label className={styles.projectCheckItem} data-checked={formData.canManageExpense ? 'true' : 'false'}>
                    <input
                      type="checkbox"
                      checked={formData.canManageExpense}
                      onChange={e => setFormData(p => ({ ...p, canManageExpense: e.target.checked }))}
                      className={styles.projectCheckbox}
                    />
                    <span>비용관리(법인카드/간편장부) 접근 권한 부여</span>
                  </label>
                </div>
              )}

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

              {editingUser && (
                <div className={styles.resumeSection}>
                  <label className={styles.label}>이력서</label>
                  {resumeError && <p className={styles.hintError}>{resumeError}</p>}
                  {editingUser.resumeFilename ? (
                    <div className={styles.resumeRow}>
                      <a href={`/api/users/${editingUser.id}/resume`} target="_blank" rel="noopener noreferrer" className={styles.resumeLink}>
                        📄 {editingUser.resumeFilename}
                      </a>
                      <button type="button" onClick={handleResumeDelete} className={styles.btnCancel}>삭제</button>
                    </div>
                  ) : (
                    <label className={styles.fileDropBtn}>
                      {resumeUploading ? '업로드 중...' : '📎 이력서 첨부'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={e => { handleResumeUpload(e.target.files?.[0]); e.target.value = ''; }}
                        disabled={resumeUploading}
                      />
                    </label>
                  )}
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

        {viewMode === 'orgchart' && (
          <div className={styles.tableCard} style={{ padding: 20 }}>
            {(() => {
              const groups = new Map<string, User[]>();
              for (const u of users) {
                const key = u.orgUnit?.trim() || '미지정';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(u);
              }
              const sortedKeys = Array.from(groups.keys()).sort((a, b) => a === '미지정' ? 1 : b === '미지정' ? -1 : a.localeCompare(b));
              return sortedKeys.map(key => (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {key}
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{groups.get(key)!.length}명</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {groups.get(key)!.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 20 }}>
                        <span className={styles.memberAvatar}>{u.name[0]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                        <span className={styles.roleBadge} data-role={u.role} style={{ fontSize: 10 }}>{roleLabel(u.role)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
            {users.length === 0 && <div className={styles.emptyState}>등록된 팀원이 없습니다.</div>}
          </div>
        )}

        {viewMode === 'list' && (
        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['멤버', '역할', '소속', '팀 리더', '소속 그룹', '상태', '철수일', '소속 프로젝트', '가입일', ''].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.tdName}>
                      <div className={styles.memberCell}>
                        <span className={styles.memberAvatar}>{u.name[0]}</span>
                        <div className={styles.memberCellText}>
                          <span className={styles.memberCellName}>{u.name}</span>
                          <span className={styles.memberCellEmail}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.roleBadge} data-role={u.role}>{roleLabel(u.role)}</span>
                    </td>
                    <td className={styles.tdSecondary}>{u.affiliation || '-'}</td>
                    <td className={styles.tdSecondary}>{u.manager?.name || '-'}</td>
                    <td className={styles.tdSecondary}>{u.orgUnit || '-'}</td>
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
        )}
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
