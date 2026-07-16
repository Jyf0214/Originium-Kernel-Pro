'use client';

import { Form, Input } from 'antd';
import type { SettingsFormFieldProps } from '../_lib/types';

const inputClassName =
  '!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900';

/**
 * 适配 antd Form 的统一表单项：左侧图标 + 标签 + 额外说明。
 * 不传 children 时使用默认 Input。
 */
export function SettingsFormField({
  name,
  label,
  icon,
  placeholder,
  extra,
  rules,
  children,
}: SettingsFormFieldProps) {
  return (
    <Form.Item
      name={name}
      label={
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          {label}
        </div>
      }
      extra={extra && <span className="text-xs text-zinc-400">{extra}</span>}
      rules={rules}
    >
      {children ?? (
        <Input
          placeholder={placeholder}
          className={inputClassName}
          allowClear
        />
      )}
    </Form.Item>
  );
}
