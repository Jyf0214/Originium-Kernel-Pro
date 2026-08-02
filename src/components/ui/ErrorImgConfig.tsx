import React from 'react';
import FormField from './FormField';
import { useI18n } from '@/hooks/use-i18n';

interface ErrorImgConfigData {
  flink: string;
  postPage: string;
}

interface ErrorImgConfigProps {
  config: ErrorImgConfigData;
  onChange: (config: ErrorImgConfigData) => void;
}

export default function ErrorImgConfig({ config, onChange }: ErrorImgConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <FormField
        label={t('components.errorImgConfig.flinkLabel')}
        value={config.flink}
        onChange={v => onChange({ ...config, flink: v })}
        placeholder="/img/friend_404.gif"
      />
      <FormField
        label={t('components.errorImgConfig.postPageLabel')}
        value={config.postPage}
        onChange={v => onChange({ ...config, postPage: v })}
        placeholder="/img/404.jpg"
      />
    </div>
  );
}
