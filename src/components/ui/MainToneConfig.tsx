import React from 'react';
import { Select } from '@/components/ui/Select';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface MainToneConfigData {
  enable: boolean;
  mode: 'cdn' | 'api' | 'both';
}

interface MainToneConfigProps {
  config: MainToneConfigData;
  onChange: (config: MainToneConfigData) => void;
}

const modeOptions = [
  { value: 'api', label: 'API' },
  { value: 'cdn', label: 'CDN' },
  { value: 'both', label: 'Both（CDN → API）' },
];

export default function MainToneConfig({ config, onChange }: MainToneConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <ToggleField
        label={t('components.MainToneConfig.enable')}
        description={t('components.MainToneConfig.enableDesc')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />
      <div>
        <label className="block text-sm font-medium mb-2">{t('components.MainToneConfig.mode')}</label>
        <Select
          value={config.mode}
          onChange={e => onChange({ ...config, mode: e.target.value as MainToneConfigData['mode'] })}
          rounded="md"
        >
          {modeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <p className="text-xs text-zinc-400 mt-1">
          {t('components.MainToneConfig.modeDesc')}
        </p>
      </div>
    </div>
  );
}
