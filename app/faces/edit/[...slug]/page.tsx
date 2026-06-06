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
import { EditFaceLoading } from './_components/EditFaceLoading';
import { EditFaceShell } from './_components/EditFaceShell';

export default function EditFacePage() {
  const params = useParams();
  const { t } = useI18n();
  const { fullPath, filePath } = buildFacePaths(params?.slug);
  const { isSudo, authLoading } = useEditPermission();
  const { form, file, groups, loading } = useFaceData(fullPath);
  const { submitting, deleting, submit, remove } = useEditActions({ filePath });

  if (loading || authLoading) return <EditFaceLoading />;
  if (!isSudo || !file) return null;

  return (
    <EditFaceShell>
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
    </EditFaceShell>
  );
}
