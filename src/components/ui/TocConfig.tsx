import React from 'react';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface TocConfigData {
  post: boolean;
  page: boolean;
  number: boolean;
  expand: boolean;
  styleSimple: boolean;
}

interface TocConfigProps {
  config: TocConfigData;
  onChange: (config: TocConfigData) => void;
}

export default function TocConfig({ config, onChange }: TocConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ToggleField label={t('components.TocConfig.postToc')} checked={config.post} onChange={v => onChange({ ...config, post: v })} />
        <ToggleField label={t('components.TocConfig.pageToc')} checked={config.page} onChange={v => onChange({ ...config, page: v })} />
        <ToggleField label={t('components.TocConfig.showNumber')} checked={config.number} onChange={v => onChange({ ...config, number: v })} />
        <ToggleField label={t('components.TocConfig.defaultExpand')} checked={config.expand} onChange={v => onChange({ ...config, expand: v })} />
      </div>
      <ToggleField label={t('components.TocConfig.simpleStyle')} description={t('components.TocConfig.simpleStyleDesc')} checked={config.styleSimple} onChange={v => onChange({ ...config, styleSimple: v })} />
    </div>
  );
}
