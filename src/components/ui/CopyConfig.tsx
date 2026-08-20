import React from 'react';
import { Input } from '@/components/ui/Input';
import { getTranslate } from '@/i18n/translate';
import ToggleField from './ToggleField';

interface CopyConfigData {
  enable: boolean;
  copyright: {
    enable: boolean;
    limitCount: number;
  };
}

interface CopyConfigProps {
  config: CopyConfigData;
  onChange: (config: CopyConfigData) => void;
}

export default function CopyConfig({ config, onChange }: CopyConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField
        label={getTranslate('components.CopyConfig.copyPopup')}
        description={getTranslate('components.CopyConfig.copyPopupDesc')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div className="pl-4 border-l-2 border-zinc-100 space-y-4">
        <ToggleField
          label={getTranslate('components.CopyConfig.appendCopyright')}
          description={getTranslate('components.CopyConfig.appendCopyrightDesc')}
          checked={config.copyright.enable}
          onChange={v => onChange({ ...config, copyright: { ...config.copyright, enable: v } })}
        />

        <div>
          <label className="block text-sm font-medium mb-2">{getTranslate('components.CopyConfig.minCharCount')}</label>
          <Input
            type="number"
            value={config.copyright.limitCount}
            onChange={e => onChange({ ...config, copyright: { ...config.copyright, limitCount: e.target.value === '' ? 50 : Number(e.target.value) } })}
            min={0}
            max={9999}
            rounded="md"
          />
          <p className="text-xs text-zinc-400 mt-1">{getTranslate('components.CopyConfig.minCharCountDesc')}</p>
        </div>
      </div>
    </div>
  );
}
