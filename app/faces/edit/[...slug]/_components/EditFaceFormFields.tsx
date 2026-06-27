'use client';

import { Form, Input, Select } from 'antd';

import type { GroupOption } from '../_lib/types';

const { TextArea } = Input;

const INPUT_CLASS = 'h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900';
const LABEL_CLASS = 'text-zinc-700 font-medium';

/** 姓名 + 邮箱 */
export function NameEmailFields({ t }: { t: (key: string) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Form.Item
        label={<span className={LABEL_CLASS}>{t('auth.username')} *</span>}
        name="name"
        rules={[{ required: true, message: t('validation.required') }]}
      >
        <Input
          placeholder={t('auth.usernamePlaceholder')}
          className={INPUT_CLASS}
        />
      </Form.Item>

      <Form.Item
        label={<span className={LABEL_CLASS}>{t('auth.email')}</span>}
        name="email"
        rules={[{ type: 'email', message: t('validation.emailInvalid') }]}
      >
        <Input
          placeholder={t('auth.inputEmailPlaceholder')}
          className={INPUT_CLASS}
        />
      </Form.Item>
    </div>
  );
}

/** 电话 + 分组 */
export function PhoneGroupFields({
  groups,
  t,
}: {
  groups: GroupOption[];
  t: (key: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Form.Item
        label={<span className={LABEL_CLASS}>{t('article.phone') || 'Phone'}</span>}
        name="phone"
      >
        <Input
          placeholder={t('article.phonePlaceholder') || 'Phone'}
          className={INPUT_CLASS}
        />
      </Form.Item>

      <Form.Item
        label={<span className={LABEL_CLASS}>{t('faces.groupName')} *</span>}
        name="group"
        rules={[{ required: true, message: t('validation.required') }]}
      >
        <Select
          placeholder={t('faces.groupName')}
          className="h-10 rounded-lg text-sm"
          placement="bottomLeft"
          options={groups.map((group) => ({
            value: group.groupName,
            label: group.title || group.groupName,
          }))}
        />
      </Form.Item>
    </div>
  );
}

/** 详细内容 */
export function ContentField({ t }: { t: (key: string) => string }) {
  return (
    <Form.Item
      label={<span className={LABEL_CLASS}>{t('article.content')}</span>}
      name="content"
    >
      <TextArea
        placeholder={t('editor.contentPlaceholder')}
        className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
        autoSize={{ minRows: 6 }}
        style={{ fontFamily: 'inherit', resize: 'vertical' }}
      />
    </Form.Item>
  );
}
