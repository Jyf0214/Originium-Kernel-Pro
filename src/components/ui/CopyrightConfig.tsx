import React from 'react';
import { getTranslate } from '@/i18n/translate';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface CopyrightConfigData {
  enable: boolean;
  decode: boolean;
  authorHref: string;
  license: string;
  licenseUrl: string;
  authorLink: string;
}

interface CopyrightConfigProps {
  config: CopyrightConfigData;
  onChange: (config: CopyrightConfigData) => void;
}

export default function CopyrightConfig({ config, onChange }: CopyrightConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField label={getTranslate('components.CopyrightConfig.enableCopyright')} checked={config.enable} onChange={v => onChange({ ...config, enable: v })} />
      <ToggleField label={getTranslate('components.CopyrightConfig.decodeHtml')} description={getTranslate('components.CopyrightConfig.decodeHtmlDesc')} checked={config.decode} onChange={v => onChange({ ...config, decode: v })} />

      <div className="grid grid-cols-2 gap-4">
        <FormField label={getTranslate('components.CopyrightConfig.authorLink')} value={config.authorLink} onChange={v => onChange({ ...config, authorLink: v })} placeholder="/" />
        <FormField label={getTranslate('components.CopyrightConfig.authorAddress')} value={config.authorHref} onChange={v => onChange({ ...config, authorHref: v })} placeholder="https://" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={getTranslate('components.CopyrightConfig.license')} value={config.license} onChange={v => onChange({ ...config, license: v })} placeholder="CC BY-NC-SA 4.0" />
        <FormField label={getTranslate('components.CopyrightConfig.licenseLink')} value={config.licenseUrl} onChange={v => onChange({ ...config, licenseUrl: v })} placeholder="https://creativecommons.org/licenses/by-nc-sa/4.0/" />
      </div>
    </div>
  );
}
