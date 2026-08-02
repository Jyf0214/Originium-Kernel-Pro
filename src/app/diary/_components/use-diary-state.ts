import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';
import type { DiaryEntry } from './types';

export interface UseDiaryStateResult {
  diaries: DiaryEntry[];
  groups: string[];
  loading: boolean;
  authLoading: boolean;
  isAuthorized: boolean;
  viewingId: string | null;
  viewContent: string;
  viewLoading: boolean;
  deleting: string | null;
  pinning: string | null;
  exportLoading: boolean;
  searchText: string;
  startDate: string;
  endDate: string;
  activeGroup: string | null;
  setSearchText: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setActiveGroup: (v: string | null) => void;
  fetchDiaries: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleTogglePin: (id: string) => Promise<void>;
  handleView: (d: DiaryEntry) => Promise<void>;
  handleExport: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}

export function useDiaryState(): UseDiaryStateResult {
  const { t } = useI18n();
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // 搜索文本防抖：300ms 后才触发实际查询
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
      debounceTimerRef.current = null;
    }, 300);
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText]);

  const isAuthorized = !authLoading && !!user && isSudo;

  const fetchDiaries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearchText.trim()) params.set('search', debouncedSearchText.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (activeGroup) params.set('group', activeGroup);
      const qs = params.toString();
      const res = await fetch(`/api/diary${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(t('diary.loadFailed'));
      const json = await res.json();
      setDiaries(Array.isArray(json.diaries) ? json.diaries : []);
      if (Array.isArray(json.groups)) setGroups(json.groups);
    } catch {
      showError(t('diary.listLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchText, startDate, endDate, activeGroup, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
      return;
    }
    void fetchDiaries();
  }, [user, isSudo, authLoading, router, fetchDiaries]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('diary.deleteFailed'));
      if (viewingId === id) {
        setViewingId(null);
        setViewContent('');
      }
      await fetchDiaries();
    } catch {
      showError(t('diary.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  }, [viewingId, fetchDiaries, t]);

  const handleTogglePin = useCallback(async (id: string) => {
    setPinning(id);
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error(t('diary.pinFailed'));
      await fetchDiaries();
    } catch {
      showError(t('diary.pinStateFailed'));
    } finally {
      setPinning(null);
    }
  }, [fetchDiaries, t]);

  const handleView = useCallback(async (d: DiaryEntry) => {
    if (viewingId === d.id) {
      setViewingId(null);
      setViewContent('');
      return;
    }
    setViewLoading(true);
    setViewingId(d.id);
    try {
      const res = await fetch(`/api/diary/${d.id}`);
      if (!res.ok) throw new Error(t('diary.loadFailed'));
      const json = await res.json();
      setViewContent(json.diary?.content ?? '');
    } catch {
      showError(t('diary.contentLoadFailed'));
      setViewingId(null);
    } finally {
      setViewLoading(false);
    }
  }, [viewingId, t]);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/diary/export');
      if (!res.ok) throw new Error(t('diary.exportFailed'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary-export-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showError(t('diary.exportDiaryFailed'));
    } finally {
      setExportLoading(false);
    }
  }, [t]);

  return {
    diaries,
    groups,
    loading,
    authLoading,
    isAuthorized,
    viewingId,
    viewContent,
    viewLoading,
    deleting,
    pinning,
    exportLoading,
    searchText,
    startDate,
    endDate,
    activeGroup,
    setSearchText,
    setStartDate,
    setEndDate,
    setActiveGroup,
    fetchDiaries,
    handleDelete,
    handleTogglePin,
    handleView,
    handleExport,
    router,
  };
}
