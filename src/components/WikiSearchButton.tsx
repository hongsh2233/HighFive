'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/common/Modal';
import styles from './WikiSearchButton.module.css';

interface WikiSearchResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string;
  updatedAt: string;
}

export default function WikiSearchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (q: string) => {
    setLoading(true);
    apiClient
      .get<{ data: WikiSearchResult[] }>(`/wiki/search?q=${encodeURIComponent(q)}`)
      .then((res) => setResults(res.data.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    runSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (result: WikiSearchResult) => {
    setOpen(false);
    setQuery('');
    router.push(`/projects/${result.projectId}/wiki?open=${result.id}`);
  };

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="위키 검색"
        title="위키 검색"
      >
        📖
      </button>

      <Modal open={open} onClose={close} title="위키 검색" maxWidth={520}>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="문서 제목이나 내용으로 검색..."
          className={styles.searchInput}
        />
        <div className={styles.resultList}>
          {loading ? (
            <div className={styles.empty}>검색 중...</div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>{query ? '검색 결과가 없습니다.' : '소속 프로젝트에 등록된 위키 문서가 없습니다.'}</div>
          ) : (
            results.map((r) => (
              <button key={r.id} type="button" className={styles.resultItem} onClick={() => handleSelect(r)}>
                <div className={styles.resultTop}>
                  <span className={styles.resultProject}>{r.projectName}</span>
                  <span className={styles.resultTitle}>{r.title}</span>
                </div>
                <div className={styles.resultSnippet}>{r.snippet}</div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
