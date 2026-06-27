'use client';

import { Form, type FormInstance } from 'antd';

import type { ContentFile } from '@/types/content';
import type { FormValues, GroupOption } from '../_lib/types';
import {
  ContentField,
  NameEmailFields,
  PhoneGroupFields,
} from './EditFaceFormFields';
import { EditFaceFormActions } from './EditFaceFormActions';

/** 编辑联系人表单(组合字段 + 底部按钮) */
export function EditFaceForm({
  form,
  file: _file,
  groups,
  submitting,
  deleting,
  fullPath,
  onSubmit,
  onDelete,
  t,
}: {
  form: FormInstance<FormValues>;
  file: ContentFile;
  groups: GroupOption[];
  submitting: boolean;
  deleting: boolean;
  fullPath: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onDelete: () => Promise<void>;
  t: (key: string) => string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        className="space-y-6"
        requiredMark={false}
      >
        <NameEmailFields t={t} />
        <PhoneGroupFields groups={groups} t={t} />
        <ContentField t={t} />
        <EditFaceFormActions
          fullPath={fullPath}
          submitting={submitting}
          deleting={deleting}
          onDelete={onDelete}
          t={t}
        />
      </Form>
    </div>
  );
}
