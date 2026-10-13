'use client';

import { MentionUser } from '@/hooks/useMention';
import styles from './Mention.module.css';

/** 댓글 입력창 위에 뜨는 멘션 대상 목록. 부모는 position: relative 여야 한다. */
export default function MentionDropdown({ users, onSelect }: { users: MentionUser[]; onSelect: (user: MentionUser) => void }) {
  if (users.length === 0) return null;
  return (
    <ul className={styles.mentionDropdown} role="listbox" aria-label="멘션할 사람">
      {users.map((u) => (
        <li key={u.id}>
          <button
            type="button"
            role="option"
            aria-selected={false}
            className={styles.mentionItem}
            onMouseDown={(e) => { e.preventDefault(); onSelect(u); }}
          >
            <span className={styles.mentionAvatar}>{u.name[0]}</span>
            {u.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 저장된 댓글의 `@[이름](id)`를 멘션 표시로 바꿔 보여 준다. */
export function MentionText({ content, currentUserId }: { content: string; currentUserId?: number | null }) {
  const parts = content.split(/(@\[[^\]]+\]\(\d+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^@\[([^\]]+)\]\((\d+)\)$/);
        if (m) {
          const isSelf = parseInt(m[2]) === currentUserId;
          return <span key={i} className={isSelf ? styles.mentionSelf : styles.mention}>@{m[1]}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
