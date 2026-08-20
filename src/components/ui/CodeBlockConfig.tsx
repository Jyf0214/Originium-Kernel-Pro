import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getTranslate } from '@/i18n/translate';
import ToggleField from './ToggleField';

interface CodeBlockConfigData {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

interface CodeBlockConfigProps {
  config: CodeBlockConfigData;
  onChange: (config: CodeBlockConfigData) => void;
}

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'pale-night', label: 'Pale Night' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'mac', label: 'Mac' },
  { value: 'mac-light', label: 'Mac Light' },
];

export default function CodeBlockConfig({ config, onChange }: CodeBlockConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">{getTranslate('components.CodeBlockConfig.highlightTheme')}</label>
        <Select
          value={config.theme}
          onChange={e => onChange({ ...config, theme: e.target.value })}
          rounded="md"
        >
          {themeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ToggleField
          label={getTranslate('components.CodeBlockConfig.copyButton')}
          checked={config.copy}
          onChange={v => onChange({ ...config, copy: v })}
        />
        <ToggleField
          label={getTranslate('components.CodeBlockConfig.showLanguage')}
          checked={config.lang}
          onChange={v => onChange({ ...config, lang: v })}
        />
        <ToggleField
          label={getTranslate('components.CodeBlockConfig.foldCode')}
          description={getTranslate('components.CodeBlockConfig.foldCodeDesc')}
          checked={config.shrink}
          onChange={v => onChange({ ...config, shrink: v })}
        />
        <ToggleField
          label={getTranslate('components.CodeBlockConfig.wordWrap')}
          checked={config.wordWrap}
          onChange={v => onChange({ ...config, wordWrap: v })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">{getTranslate('components.CodeBlockConfig.heightLimit')}</label>
        <Input
          type="number"
          value={config.heightLimit}
          onChange={e => onChange({ ...config, heightLimit: e.target.value === '' ? 330 : Number(e.target.value) })}
          min={0}
          max={9999}
          rounded="md"
        />
        <p className="text-xs text-zinc-400 mt-1">{getTranslate('components.CodeBlockConfig.noLimit')}</p>
      </div>
    </div>
  );
}
