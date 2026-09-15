'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import styles from './TopSearch.module.css';

interface TaskResult {
  id: number;
  title: string;
  status: string;
  snippet: string;
  projectId: number | null;
  projectName: string | null;
  workerName: string | null;
}

interface WikiResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string | null;
}

export default function TopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [wiki, setWiki] = useState<WikiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiKeyword, setAiKeyword] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    apiClient.get<{ data: { features: { aiSearch: boolean } } }>('/settings/ai/status')
      .then((res) => setAiSearchEnabled(!!res.data.data.features.aiSearch))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setTasks([]); setWiki([]); return; }
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: { tasks: TaskResult[]; wiki: WikiResult[] } }>(
        `/search?q=${encodeURIComponent(q)}`
      );
      setTasks(res.data.data.tasks);
      setWiki(res.data.data.wiki);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setAiKeyword(null);
    setOpen(true);
    if (aiMode) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const aiSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post<{ data: { keyword: string; tasks: TaskResult[]; wiki: WikiResult[] } }>('/ai/search', { query: q });
      setAiKeyword(res.data.data.keyword);
      setTasks(res.data.data.tasks);
      setWiki(res.data.data.wiki);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDropdown = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeDropdown();
    if (e.key === 'Enter' && aiMode) aiSearch(query);
  };

  const goTask = (id: number) => {
    router.push(`/tasks/${id}`);
    setQuery('');
    closeDropdown();
  };

  const goWiki = (projectId: number, id: number) => {
    router.push(`/projects/${projectId}/wiki?open=${id}`);
    setQuery('');
    closeDropdown();
  };

  const hasResults = tasks.length > 0 || wiki.length > 0;
  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.inputBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={aiMode ? '자연어로 검색... (Enter)' : '검색 (Ctrl+K)'}
          className={styles.input}
        />
        {aiSearchEnabled && (
          <button
            className={aiMode ? styles.aiToggleActive : styles.aiToggle}
            onClick={() => { setAiMode((v) => !v); setAiKeyword(null); }}
            title="AI 자연어 검색"
          >
            ✨
          </button>
        )}
        {loading && <span className={styles.loadingDot}>⋯</span>}
      </div>

      {showDropdown && (
        <div className={styles.dropdown}>
          {aiKeyword && (
            <p className={styles.aiKeywordHint}>🔍 AI가 추출한 검색어: <strong>{aiKeyword}</strong></p>
          )}

          {!hasResults && !loading && (
            <p className={styles.empty}>검색 결과가 없습니다.</p>
          )}

          {tasks.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>업무</div>
              {tasks.map((t) => (
                <button key={t.id} className={styles.item} onClick={() => goTask(t.id)}>
                  <div className={styles.itemTitle}>{t.title}</div>
                  <div className={styles.itemMeta}>
                    {t.projectName && <span>{t.projectName}</span>}
                    {t.workerName && <span>{t.workerName}</span>}
                    <span>{t.status}</span>
                  </div>
                  {t.snippet && <div className={styles.snippet}>{t.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {wiki.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>위키</div>
              {wiki.map((w) => (
                <button key={w.id} className={styles.item} onClick={() => goWiki(w.projectId, w.id)}>
                  <div className={styles.itemTitle}>{w.title}</div>
                  {w.projectName && <div className={styles.itemMeta}><span>{w.projectName}</span></div>}
                  {w.snippet && <div className={styles.snippet}>{w.snippet}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
