'use client';

import { useParams } from 'next/navigation';

import { useI18n } from '@/hooks/use-i18n';
import { buildFacePaths } from './_lib/build-file-path';
import { useFaceData } from './_lib/use-face-data';
import { useEditPermission } from './_lib/use-edit-permission';
import { useEditActions } from './_lib/use-edit-actions';
import { EditFaceBreadcrumb } from './_components/EditFaceBreadcrumb';
import { EditFaceForm } from './_components/EditFaceForm';
import { EditFaceHeader } from './_components/EditFaceHeader';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';

export default function EditFacePage() {
  const params = useParams();
  const { t } = useI18n();
  const { fullPath, filePath } = buildFacePaths(params?.slug);
  const { isSudo, authLoading } = useEditPermission();
  const { form, file, groups, loading } = useFaceData(fullPath);
  const { submitting, deleting, submit, remove } = useEditActions({ filePath });

  if (loading || authLoading) return <div className="min-h-screen flex flex-col bg-zinc-50"><div className="flex-1 flex items-center justify-center"><GlobalLoading size="large" /></div></div>;
  if (!isSudo || !file) return null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <PageContainer maxWidth="4xl">
      <EditFaceBreadcrumb fullPath={fullPath} title={file.meta.title} t={t} />
      <EditFaceHeader title={file.meta.title} />
      <EditFaceForm
        form={form}
        file={file}
        groups={groups}
        submitting={submitting}
        deleting={deleting}
        fullPath={fullPath}
        onSubmit={submit}
        onDelete={remove}
        t={t}
      />
      </PageContainer>
    </div>
  );
}
