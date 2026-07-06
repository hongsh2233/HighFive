'use client';

import { useEffect, useState } from 'react';
import { useStickyNotes, MAX_STICKY_NOTES } from '@/hooks/useStickyNotes';
import styles from './StickyNotesPanel.module.css';

const SIDE_KEY = 'stickyNotesSide';
const OPEN_KEY = 'stickyNotesOpen';

type Side = 'left' | 'right';

export default function StickyNotesPanel() {
  const { notes, addNote, updateNote, deleteNote, reorderNotes } = useStickyNotes();
  const [side, setSide] = useState<Side>('right');
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    const savedSide = localStorage.getItem(SIDE_KEY);
    if (savedSide === 'left' || savedSide === 'right') setSide(savedSide);
    setOpen(localStorage.getItem(OPEN_KEY) === 'true');
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(OPEN_KEY, String(next));
  };

  const toggleSide = () => {
    const next: Side = side === 'right' ? 'left' : 'right';
    setSide(next);
    localStorage.setItem(SIDE_KEY, next);
  };

  const handleDrop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) { setDraggedId(null); return; }
    const ids = notes.map((n) => n.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDraggedId(null); return; }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDraggedId(null);
    reorderNotes(ids).catch((err) => console.error(err));
  };

  const atLimit = notes.length >= MAX_STICKY_NOTES;

  return (
    <>
      <button
        type="button"
        className={`${styles.tab} ${side === 'left' ? styles.tabLeft : styles.tabRight}`}
        onClick={toggleOpen}
        aria-label="메모 패널 열기/닫기"
      >
        메모
      </button>

      {open && (
        <div className={`${styles.panel} ${side === 'left' ? styles.panelLeft : styles.panelRight}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>메모 ({notes.length}/{MAX_STICKY_NOTES})</span>
            <div className={styles.panelHeaderActions}>
              <button type="button" className={styles.iconBtn} onClick={toggleSide} title="반대편으로 이동">⇄</button>
              <button type="button" className={styles.iconBtn} onClick={toggleOpen} title="닫기">✕</button>
            </div>
          </div>

          <div className={styles.noteList}>
            {notes.map((note) => (
              <div
                key={note.id}
                className={styles.noteCard}
                draggable
                onDragStart={() => setDraggedId(note.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(note.id)}
              >
                <div className={styles.noteCardHeader}>
                  <span className={styles.dragHandle}>⠿</span>
                  <button
                    type="button"
                    className={styles.noteDeleteBtn}
                    onClick={() => deleteNote(note.id).catch((err) => console.error(err))}
                    aria-label="메모 삭제"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  className={styles.noteTextarea}
                  defaultValue={note.content}
                  placeholder="메모를 입력하세요..."
                  onBlur={(e) => updateNote(note.id, e.target.value).catch((err) => console.error(err))}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.addBtn}
            disabled={atLimit}
            title={atLimit ? `메모는 최대 ${MAX_STICKY_NOTES}개까지 만들 수 있습니다.` : undefined}
            onClick={() => addNote().catch((err) => console.error(err))}
          >
            + 메모 추가
          </button>
        </div>
      )}
    </>
  );
}
