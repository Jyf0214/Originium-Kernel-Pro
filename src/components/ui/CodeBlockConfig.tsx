import React from 'react';
import { Select, InputNumber } from 'antd';
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
          onChange={v => onChange({ ...config, theme: v })}
          options={themeOptions}
          style={{ width: '100%' }}
          className="!rounded-lg"
          placement="bottomLeft"
        />
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
        <InputNumber
          value={config.heightLimit}
          onChange={v => onChange({ ...config, heightLimit: v ?? 330 })}
          min={0}
          max={9999}
          className="!w-full !rounded-lg"
        />
        <p className="text-xs text-zinc-400 mt-1">{getTranslate('components.CodeBlockConfig.noLimit')}</p>
      </div>
    </div>
  );
}
