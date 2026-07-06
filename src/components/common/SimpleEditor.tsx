'use client';

import { useRef } from 'react';
import styles from './SimpleEditor.module.css';

interface SimpleEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SimpleEditor({ value, onChange, placeholder }: SimpleEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string, sample: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || sample;
    const newVal = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const insertBullet = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newVal = value.slice(0, lineStart) + '- ' + value.slice(lineStart);
    onChange(newVal);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); });
  };

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.editorToolbar}>
        <button type="button" className={styles.editorBtn} title="굵게" onClick={() => insertFormat('**', '**', '굵은 텍스트')}><strong>B</strong></button>
        <button type="button" className={styles.editorBtn} title="기울임" onClick={() => insertFormat('*', '*', '기울임 텍스트')}><em>I</em></button>
        <button type="button" className={styles.editorBtn} title="목록" onClick={insertBullet}>≡</button>
        <span className={styles.editorHint}>**굵게** *기울임* - 목록</span>
      </div>
      <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required rows={8} className={styles.editorTextarea} />
    </div>
  );
}
