'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';

export interface MentionUser { id: number; name: string }

/** 댓글에 저장되는 멘션 형식. 서버(댓글 API)가 이 형식을 파싱해 멘션 알림을 보낸다. */
export function formatMention(user: MentionUser) {
  return `@[${user.name}](${user.id})`;
}

/**
 * 댓글 입력창의 @멘션 자동완성 상태.
 * 업무 상세 화면과 요약보기(오른쪽 패널)가 같은 동작을 쓰도록 공유한다.
 */
export function useMention(users: MentionUser[]) {
  const [query, setQuery] = useState<string | null>(null);
  const anchorRef = useRef(0); // ref로 스테일 클로저 방지
  const queryRef = useRef<string | null>(null);

  const detect = useCallback((value: string, cursor: number) => {
    const match = value.slice(0, cursor).match(/@([^@\n]*)$/);
    if (match) {
      anchorRef.current = cursor - match[0].length;
      queryRef.current = match[1];
      setQuery(match[1]);
    } else {
      queryRef.current = null;
      setQuery(null);
    }
  }, []);

  const close = useCallback(() => {
    queryRef.current = null;
    setQuery(null);
  }, []);

  const filtered = query !== null
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];
  const isOpen = query !== null && filtered.length > 0;

  const insert = (
    current: string,
    setter: (value: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    user: MentionUser,
  ) => {
    const anchor = anchorRef.current;
    const q = queryRef.current ?? '';
    const before = current.slice(0, anchor);
    const after = current.slice(anchor + 1 + q.length);
    const inserted = `${formatMention(user)} `;
    setter(before + inserted + after);
    close();
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursor = before.length + inserted.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  /** 멘션 목록이 열려 있을 때 Escape(닫기)·Enter/Tab(첫 번째 사람 선택)을 처리한다. 처리했으면 true. */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    current: string,
    setter: (value: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  ) => {
    if (!isOpen) return false;
    if (e.key === 'Escape') { e.preventDefault(); close(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insert(current, setter, textareaRef, filtered[0]);
      return true;
    }
    return false;
  };

  return { query, filtered, isOpen, detect, close, insert, handleKeyDown };
}

/** 멘션 후보(조직의 전체 사용자, 모든 역할)를 한 번 불러온다. */
export function useMentionUsers(enabled = true) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiClient.get<{ data: MentionUser[] }>('/users?minimal=true')
      .then((res) => { if (!cancelled && Array.isArray(res.data.data)) setUsers(res.data.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);
  return users;
}
