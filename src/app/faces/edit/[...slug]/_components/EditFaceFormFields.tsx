'use client';

import { Form } from 'antd';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { GroupOption } from '../_lib/types';
import type { TFunc } from '@/i18n/keys';

const LABEL_CLASS = 'text-zinc-700 font-medium';

/** 姓名 + 邮箱 */
export function NameEmailFields({ t }: { t: TFunc }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Form.Item
        label={<span className={LABEL_CLASS}>{t('auth.username')} *</span>}
        name="name"
        rules={[{ required: true, message: t('validation.required') }]}
      >
        <Input
          placeholder={t('auth.usernamePlaceholder')}
          rounded="md"
        />
      </Form.Item>

      <Form.Item
        label={<span className={LABEL_CLASS}>{t('auth.email')}</span>}
        name="email"
        rules={[{ type: 'email', message: t('validation.emailInvalid') }]}
      >
        <Input
          placeholder={t('auth.inputEmailPlaceholder')}
          rounded="md"
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
  t: TFunc;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Form.Item
        label={<span className={LABEL_CLASS}>{t('article.phone') || 'Phone'}</span>}
        name="phone"
      >
        <Input
          placeholder={t('article.phonePlaceholder') || 'Phone'}
          rounded="md"
        />
      </Form.Item>

      <Form.Item
        label={<span className={LABEL_CLASS}>{t('faces.groupName')} *</span>}
        name="group"
        rules={[{ required: true, message: t('validation.required') }]}
      >
        <Select
          size="md"
          rounded="md"
        >
          <option value="" disabled hidden>
            {t('faces.groupName')}
          </option>
          {groups.map((group) => (
            <option key={group.groupName} value={group.groupName}>
              {group.title || group.groupName}
            </option>
          ))}
        </Select>
      </Form.Item>
    </div>
  );
}

/** 详细内容 */
export function ContentField({ t }: { t: TFunc }) {
  return (
    <Form.Item
      label={<span className={LABEL_CLASS}>{t('article.content')}</span>}
      name="content"
    >
      <Textarea
        placeholder={t('editor.contentPlaceholder')}
        rows={6}
        minH="min-h-[144px]"
        rounded="md"
      />
    </Form.Item>
  );
}
