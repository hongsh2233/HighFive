'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import styles from './TopSearch.module.css';

interface TaskResult { id: number; title: string; status: string; snippet: string; projectId: number | null; projectName: string | null; workerName: string | null; }
interface WikiResult { id: number; title: string; snippet: string; projectId: number; projectName: string | null; }
interface ProjectResult { id: number; name: string; snippet: string; status: string; }
interface MeetingResult { id: number; title: string; snippet: string; projectId: number; projectName: string | null; meetingDate: string | null; }
interface WeeklyReportResult { id: number; snippet: string; projectId: number; projectName: string | null; periodStart: string; authorName: string | null; }
interface AnnouncementResult { id: number; snippet: string; createdAt: string; }
interface FileResult { id: number; filename: string; taskId: number; taskTitle: string; }
interface MemberResult { id: number; name: string; email: string; role: string; }

interface AllResults {
  tasks: TaskResult[];
  wiki: WikiResult[];
  projects: ProjectResult[];
  meetings: MeetingResult[];
  weeklyReports: WeeklyReportResult[];
  announcements: AnnouncementResult[];
  files: FileResult[];
  members: MemberResult[];
}

const EMPTY: AllResults = { tasks: [], wiki: [], projects: [], meetings: [], weeklyReports: [], announcements: [], files: [], members: [] };

const TYPE_OPTIONS = [
  { key: 'tasks', label: '업무' },
  { key: 'projects', label: '프로젝트' },
  { key: 'wiki', label: '지식베이스' },
  { key: 'meetings', label: '회의록' },
  { key: 'weeklyReports', label: '주간보고' },
  { key: 'announcements', label: '공지' },
  { key: 'files', label: '파일' },
  { key: 'members', label: '팀원' },
];

export default function TopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AllResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiKeyword, setAiKeyword] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: number; name: string }[]>([]);
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterAuthorId, setFilterAuthorId] = useState('');
  const [filterType, setFilterType] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    apiClient.get<{ data: { features: { aiSearch: boolean } } }>('/settings/ai/status')
      .then((res) => setAiSearchEnabled(!!res.data.data.features.aiSearch))
      .catch(() => {});
    apiClient.get<{ data: { id: number; name: string }[] }>('/projects')
      .then((res) => setProjects(res.data.data.map((p: any) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
    apiClient.get<{ data: { id: number; name: string }[] }>('/users?minimal=true')
      .then((res) => setMembers(res.data.data))
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
    if (!q.trim()) { setResults(EMPTY); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (filterProjectId) params.set('projectId', filterProjectId);
      if (filterAuthorId) params.set('authorId', filterAuthorId);
      if (filterType) params.set('types', filterType);
      const res = await apiClient.get<{ data: AllResults }>(`/search?${params.toString()}`);
      setResults(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProjectId, filterAuthorId, filterType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setAiKeyword(null);
    setOpen(true);
    if (aiMode) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  useEffect(() => {
    if (query.trim() && !aiMode) search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProjectId, filterAuthorId, filterType]);

  const aiSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post<{ data: { keyword: string } & AllResults }>('/ai/search', { query: q });
      setAiKeyword(res.data.data.keyword);
      setResults(res.data.data);
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

  const goTask = (id: number) => { router.push(`/tasks/${id}`); setQuery(''); closeDropdown(); };
  const goWiki = (projectId: number, id: number) => { router.push(`/projects/${projectId}/wiki?open=${id}`); setQuery(''); closeDropdown(); };
  const goProject = () => { router.push('/projects'); setQuery(''); closeDropdown(); };
  const goMeeting = (projectId: number) => { router.push(`/projects/${projectId}/meetings`); setQuery(''); closeDropdown(); };
  const goWeeklyReport = () => { router.push('/weekly-reports'); setQuery(''); closeDropdown(); };
  const goAnnouncement = () => { router.push('/announcements'); setQuery(''); closeDropdown(); };
  const goFile = (taskId: number) => { router.push(`/tasks/${taskId}`); setQuery(''); closeDropdown(); };

  const hasResults = Object.values(results).some((arr) => arr.length > 0);
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
        <button type="button" className={styles.aiToggle} onClick={() => setShowFilters((v) => !v)} title="필터">
          ⚙️
        </button>
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

      {showFilters && (
        <div className={styles.dropdown} style={{ padding: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.input} style={{ flex: '1 1 100px' }}>
            <option value="">전체 유형</option>
            {TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className={styles.input} style={{ flex: '1 1 120px' }}>
            <option value="">전체 프로젝트</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterAuthorId} onChange={(e) => setFilterAuthorId(e.target.value)} className={styles.input} style={{ flex: '1 1 120px' }}>
            <option value="">전체 작성자</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      {showDropdown && (
        <div className={styles.dropdown}>
          {aiKeyword && (
            <p className={styles.aiKeywordHint}>🔍 AI가 추출한 검색어: <strong>{aiKeyword}</strong></p>
          )}

          {!hasResults && !loading && (
            <p className={styles.empty}>검색 결과가 없습니다.</p>
          )}

          {results.tasks.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>업무</div>
              {results.tasks.map((t) => (
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

          {results.projects.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>프로젝트</div>
              {results.projects.map((p) => (
                <button key={p.id} className={styles.item} onClick={goProject}>
                  <div className={styles.itemTitle}>{p.name}</div>
                  {p.snippet && <div className={styles.snippet}>{p.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {results.wiki.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>지식베이스</div>
              {results.wiki.map((w) => (
                <button key={w.id} className={styles.item} onClick={() => goWiki(w.projectId, w.id)}>
                  <div className={styles.itemTitle}>{w.title}</div>
                  {w.projectName && <div className={styles.itemMeta}><span>{w.projectName}</span></div>}
                  {w.snippet && <div className={styles.snippet}>{w.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {results.meetings.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>회의록</div>
              {results.meetings.map((m) => (
                <button key={m.id} className={styles.item} onClick={() => goMeeting(m.projectId)}>
                  <div className={styles.itemTitle}>{m.title}</div>
                  {m.projectName && <div className={styles.itemMeta}><span>{m.projectName}</span></div>}
                  {m.snippet && <div className={styles.snippet}>{m.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {results.weeklyReports.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>주간보고</div>
              {results.weeklyReports.map((w) => (
                <button key={w.id} className={styles.item} onClick={goWeeklyReport}>
                  <div className={styles.itemTitle}>{w.projectName || '주간보고'} · {new Date(w.periodStart).toLocaleDateString('ko-KR')}</div>
                  {w.authorName && <div className={styles.itemMeta}><span>{w.authorName}</span></div>}
                  {w.snippet && <div className={styles.snippet}>{w.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {results.announcements.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>공지사항</div>
              {results.announcements.map((a) => (
                <button key={a.id} className={styles.item} onClick={goAnnouncement}>
                  <div className={styles.snippet}>{a.snippet}</div>
                </button>
              ))}
            </div>
          )}

          {results.files.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>파일</div>
              {results.files.map((f) => (
                <button key={f.id} className={styles.item} onClick={() => goFile(f.taskId)}>
                  <div className={styles.itemTitle}>{f.filename}</div>
                  <div className={styles.itemMeta}><span>{f.taskTitle}</span></div>
                </button>
              ))}
            </div>
          )}

          {results.members.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>팀원</div>
              {results.members.map((m) => (
                <div key={m.id} className={styles.item}>
                  <div className={styles.itemTitle}>{m.name}</div>
                  <div className={styles.itemMeta}><span>{m.email}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
