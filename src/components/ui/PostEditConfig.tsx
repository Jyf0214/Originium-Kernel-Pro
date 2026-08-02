import React from 'react';
import FormField from './FormField';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface PostEditConfigData {
  enable: boolean;
  github: string | false;
}

interface PostEditConfigProps {
  config: PostEditConfigData;
  onChange: (config: PostEditConfigData) => void;
}

export default function PostEditConfig({ config, onChange }: PostEditConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <ToggleField
        label={t('components.PostEditConfig.enableOnlineEdit')}
        description={t('components.PostEditConfig.jumpToSourceHint')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />
      <FormField
        label={t('components.PostEditConfig.githubEditLink')}
        value={typeof config.github === 'string' ? config.github : ''}
        onChange={v => onChange({ ...config, github: v || false })}
        placeholder="https://github.com/user/repo/edit/branch/path/"
      />
    </div>
  );
}
