'use client';

import React from 'react';
import { useI18n } from '@/hooks/use-i18n';

/** 编辑页标题区 */
export function EditFaceHeader({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 mb-8">
      <h1 className="text-2xl font-bold text-zinc-900">{t('faces.editContact')}</h1>
      <p className="text-sm text-zinc-400">{t('faces.modifyInfo', { title })}</p>
    </div>
  );
}
