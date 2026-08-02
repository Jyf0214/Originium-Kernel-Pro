import React from 'react';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface WordCountConfigData {
  enable: boolean;
  postWordcount: boolean;
  min2read: boolean;
  totalWordcount: boolean;
}

interface WordCountConfigProps {
  config: WordCountConfigData;
  onChange: (config: WordCountConfigData) => void;
}

export default function WordCountConfig({ config, onChange }: WordCountConfigProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-4">
      <ToggleField label={t('components.WordCountConfig.enable')} checked={config.enable} onChange={v => onChange({ ...config, enable: v })} />
      <ToggleField label={t('components.WordCountConfig.postWordcount')} checked={config.postWordcount} onChange={v => onChange({ ...config, postWordcount: v })} />
      <ToggleField label={t('components.WordCountConfig.min2read')} description={t('components.WordCountConfig.min2readDesc')} checked={config.min2read} onChange={v => onChange({ ...config, min2read: v })} />
      <ToggleField label={t('components.WordCountConfig.totalWordcount')} description={t('components.WordCountConfig.totalWordcountDesc')} checked={config.totalWordcount} onChange={v => onChange({ ...config, totalWordcount: v })} />
    </div>
  );
}
