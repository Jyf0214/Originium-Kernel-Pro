import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  className?: string;
}

export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  options,
  rows = 4,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {type === 'textarea' && (
        <Textarea
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          minH={`min-h-[${rows * 24}px]`}
        />
      )}
      {type === 'select' && options && (
        <Select
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}
      {type === 'text' && (
        <Input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
