'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from 'antd';

import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';
import type { ContentFile } from '@/types/content';

import type { FormValues, GroupOption } from './types';

/** 加载联系人详情和分组列表 */
export function useFaceData(fullPath: string) {
  const router = useRouter();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();

  const [file, setFile] = useState<ContentFile | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [faceRes, groupsRes] = await Promise.all([
          fetch(`/api/faces${fullPath}`),
          fetch('/api/faces'),
        ]);

        if (!faceRes.ok) {
          if (faceRes.status === 404) {
            showError(t('faces.contactNotFound'));
            router.push('/faces');
            return;
          }
          throw new Error(t('faces.loadFaceFailed'));
        }

        const faceData: ContentFile = await faceRes.json();
        setFile(faceData);
        form.setFieldsValue({
          name: String(faceData.meta.name ?? faceData.meta.title ?? ''),
          email: String(faceData.meta.email ?? ''),
          phone: String(faceData.meta.phone ?? ''),
          group: String(faceData.meta.group ?? ''),
          content: String(faceData.content ?? ''),
        });

        if (groupsRes.ok) {
          const groupsData: { indexes?: { slug: string; title: string; groupName?: string }[] } =
            await groupsRes.json();
          const groupOptions: GroupOption[] = (groupsData.indexes ?? []).map((idx) => ({
            slug: idx.slug,
            title: idx.title,
            groupName: idx.groupName ?? idx.slug.replace('/', ''),
          }));
          setGroups(groupOptions);
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        showError(err instanceof Error ? err.message : t('faces.loadDataFailed'));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [fullPath, form, router, t]);

  return { form, file, groups, loading };
}
