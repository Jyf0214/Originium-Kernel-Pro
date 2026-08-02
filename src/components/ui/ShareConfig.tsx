import React from 'react';
import ToggleField from './ToggleField';
import FormField from './FormField';
import { useI18n } from '@/hooks/use-i18n';

interface SharejsConfig {
  enable: boolean;
  sites: string;
}

interface AddtoanyConfig {
  enable: boolean;
  item: string;
}

interface ShareConfigData {
  sharejs: SharejsConfig;
  addtoany: AddtoanyConfig;
}

interface ShareConfigProps {
  config: ShareConfigData;
  onChange: (config: ShareConfigData) => void;
}

export default function ShareConfig({ config, onChange }: ShareConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Share.js</h3>
        <ToggleField
          label={t('components.ShareConfig.enableSharejs')}
          description="https://github.com/overtrue/share.js"
          checked={config.sharejs.enable}
          onChange={v => onChange({ ...config, sharejs: { ...config.sharejs, enable: v } })}
        />
        <FormField
          label={t('components.ShareConfig.shareSites')}
          value={config.sharejs.sites}
          onChange={v => onChange({ ...config, sharejs: { ...config.sharejs, sites: v } })}
          placeholder="facebook,twitter,wechat,weibo,qq"
        />
      </div>

      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">AddToAny</h3>
        <ToggleField
          label={t('components.ShareConfig.enableAddtoany')}
          description="https://www.addtoany.com/"
          checked={config.addtoany.enable}
          onChange={v => onChange({ ...config, addtoany: { ...config.addtoany, enable: v } })}
        />
        <FormField
          label={t('components.ShareConfig.shareItems')}
          value={config.addtoany.item}
          onChange={v => onChange({ ...config, addtoany: { ...config.addtoany, item: v } })}
          placeholder="facebook,twitter,wechat,sina_weibo,email,copy_link"
        />
      </div>
    </div>
  );
}
