'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { StickyNote } from '@/types';

export const MAX_STICKY_NOTES = 3;

export function useStickyNotes() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: StickyNote[] }>('/sticky-notes');
      setNotes(res.data.data);
    } catch {
      // 무시 — 세션 만료 등은 api-client 인터셉터가 처리
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async () => {
    const res = await apiClient.post<{ data: StickyNote }>('/sticky-notes');
    setNotes((prev) => [...prev, res.data.data]);
  };

  const updateNote = async (id: number, content: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    await apiClient.patch(`/sticky-notes/${id}`, { content });
  };

  const deleteNote = async (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await apiClient.delete(`/sticky-notes/${id}`);
  };

  const reorderNotes = async (orderedIds: number[]) => {
    const reordered = orderedIds
      .map((id) => notes.find((n) => n.id === id)!)
      .filter(Boolean);
    setNotes(reordered);
    await apiClient.put('/sticky-notes', { ids: orderedIds });
  };

  return { notes, loading, addNote, updateNote, deleteNote, reorderNotes };
}
