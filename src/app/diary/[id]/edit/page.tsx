'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';
import DiaryForm from '../../_form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDiaryPage({ params }: PageProps) {
  const { t } = useI18n();
  const [id, setId] = React.useState<string | null>(null);
  const [initialTitle, setInitialTitle] = React.useState('');
  const [initialContent, setInitialContent] = React.useState('');
  const [initialTags, setInitialTags] = React.useState<string[]>([]);
  const [initialDate, setInitialDate] = React.useState('');
  const [initialGroup, setInitialGroup] = React.useState('');
  const [pageLoading, setPageLoading] = React.useState(true);
  const { user, isRoot, loading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isRoot) {
      router.push('/login');
      return;
    }

    async function init() {
      const { id: resolvedId } = await params;
      setId(resolvedId);
      try {
        const res = await fetch(`/api/diary/${resolvedId}`);
        if (!res.ok) throw new Error(t('diary.loadFailed'));
        const json = await res.json();
        if (json.diary) {
          setInitialTitle(json.diary.title ?? '');
          setInitialContent(json.diary.content ?? '');
          setInitialTags(json.diary.tags ?? []);
          setInitialDate(json.diary.date ? json.diary.date.slice(0, 10) : '');
          setInitialGroup(json.diary.group ?? '');
        }
      } catch {
        showError(t('diary.loadDiaryFailed'));
        router.push('/diary');
      } finally {
        setPageLoading(false);
      }
    }
    void init();
  }, [params, router, authLoading, user, isRoot, t]);

  if (authLoading || pageLoading) return <GlobalLoading />;
  if (!user || !isRoot) return null;
  if (!id) return null;

  return (
    <DiaryForm
      mode="edit"
      draftId={id}
      initialTitle={initialTitle}
      initialContent={initialContent}
      initialTags={initialTags}
      initialDate={initialDate}
      initialGroup={initialGroup}
      onSave={async (title, content, tags, date, group) => {
        const res = await fetch(`/api/diary/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags, date, group }),
        });
        if (!res.ok) throw new Error(t('diary.saveFailed'));
        return id;
      }}
    />
  );
}
