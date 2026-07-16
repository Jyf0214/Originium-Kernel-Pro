'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';

import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';

import { editFace, deleteFace } from '../actions';
import type { FormValues } from './types';

interface UseEditActionsParams {
  filePath: string;
}

/** 封装表单提交与删除联系人动作 */
export function useEditActions({ filePath }: UseEditActionsParams) {
  const router = useRouter();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const submit = async (values: FormValues): Promise<void> => {
    setSubmitting(true);
    try {
      const result = await editFace({
        oldPath: filePath,
        name: values.name,
        email: values.email,
        phone: values.phone,
        group: values.group,
        content: values.content,
      });
      message.success(t(result.messageKey));
      router.push(`/faces${result.newSlug}`);
    } catch (err) {
      console.error('提交失败:', err);
      showError(err instanceof Error ? err.message : t('faces.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (): Promise<void> => {
    setDeleting(true);
    try {
      const result = await deleteFace(filePath);
      message.success(t(result.messageKey));
      router.push('/faces');
    } catch (err) {
      console.error('删除失败:', err);
      showError(err instanceof Error ? err.message : t('faces.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return { submitting, deleting, submit, remove };
}
