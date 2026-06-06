'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from 'antd';

import { showError } from '@/lib/error';
import type { ContentFile } from '@/types/content';

import type { FormValues, GroupOption } from './types';

/** 加载联系人详情和分组列表 */
export function useFaceData(fullPath: string) {
  const router = useRouter();
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
            showError('联系人不存在');
            router.push('/faces');
            return;
          }
          throw new Error('加载联系人失败');
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
        showError(err instanceof Error ? err.message : '加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [fullPath, form, router]);

  return { form, file, groups, loading };
}
