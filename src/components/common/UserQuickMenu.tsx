'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Modal } from './Modal';
import { USER_ROLE_LABEL } from '@/lib/constants';
import styles from './UserQuickMenu.module.css';

interface Profile {
  id: number;
  name: string;
  email: string;
  role: string;
  affiliation: string | null;
  orgUnit: string | null;
  manager: { id: number; name: string } | null;
}

const roleLabel = (role: string) => USER_ROLE_LABEL[role] || role;

export default function UserQuickMenu({ userId, children }: { userId: number; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [noteResult, setNoteResult] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  const handleRequestTask = () => {
    setOpen(false);
    router.push(`/tasks/create?assigneeId=${userId}`);
  };

  const handleViewProfile = async () => {
    setOpen(false);
    setProfileOpen(true);
    try {
      const res = await apiClient.get<{ data: Profile }>(`/users/${userId}`);
      setProfile(res.data.data);
    } catch {
      setProfile(null);
    }
  };

  const handleOpenNote = () => {
    setOpen(false);
    setNoteText('');
    setNoteResult(null);
    setNoteOpen(true);
  };

  const handleSendNote = async () => {
    if (!noteText.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/users/${userId}/note`, { message: noteText.trim() });
      setNoteResult('쪽지를 보냈습니다.');
      setTimeout(() => setNoteOpen(false), 900);
    } catch (err: any) {
      setNoteResult(err.response?.data?.message || '전송 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button type="button" ref={triggerRef} onClick={openMenu} className={styles.trigger}>
        {children}
      </button>

      {open && (
        <div ref={menuRef} className={styles.menu} style={{ top: pos.top, left: pos.left }}>
          <button className={styles.menuItem} onClick={handleRequestTask}>업무 요청하기</button>
          <button className={styles.menuItem} onClick={handleViewProfile}>프로필 보기</button>
          <button className={styles.menuItem} onClick={handleOpenNote}>쪽지 보내기</button>
        </div>
      )}

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="프로필">
        {profile ? (
          <div className={styles.profileBody}>
            <div className={styles.profileRow}><span>이름</span><strong>{profile.name}</strong></div>
            <div className={styles.profileRow}><span>이메일</span><strong>{profile.email}</strong></div>
            <div className={styles.profileRow}><span>역할</span><strong>{roleLabel(profile.role)}</strong></div>
            <div className={styles.profileRow}><span>소속</span><strong>{profile.affiliation || '-'}</strong></div>
            <div className={styles.profileRow}><span>소속 그룹</span><strong>{profile.orgUnit || '-'}</strong></div>
            <div className={styles.profileRow}><span>팀 리더</span><strong>{profile.manager?.name || '-'}</strong></div>
          </div>
        ) : (
          <div className={styles.profileBody}>불러오는 중...</div>
        )}
      </Modal>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="쪽지 보내기">
        <textarea
          className={styles.noteTextarea}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="전달할 메시지를 입력하세요."
        />
        {noteResult && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{noteResult}</p>}
        <div className={styles.noteActions}>
          <button type="button" onClick={handleSendNote} disabled={sending || !noteText.trim()} className="btn btn-primary">
            {sending ? '보내는 중...' : '보내기'}
          </button>
          <button type="button" onClick={() => setNoteOpen(false)} className="btn btn-secondary">취소</button>
        </div>
      </Modal>
    </>
  );
}
