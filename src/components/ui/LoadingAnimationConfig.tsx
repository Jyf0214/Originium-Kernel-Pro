import React from 'react';
import { ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { Select } from '@/components/ui/Select';
import { getTranslate } from '@/i18n/translate';
import { useI18n } from '@/hooks/use-i18n';

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface LoadingConfig {
  type: LoadingType;
  color: string;
  position?: LoadingPosition;
}

interface LoadingAnimationConfigProps {
  title: string;
  config: LoadingConfig;
  onChange: (config: LoadingConfig) => void;
  showPosition?: boolean;
}

const loadingTypeOptions = [
  { value: 'spinner', label: getTranslate('loadingPreview.spinner') },
  { value: 'antd', label: getTranslate('loadingPreview.antd') },
  { value: 'text', label: getTranslate('loadingPreview.text') },
  { value: 'dots', label: getTranslate('loadingPreview.dots') },
  { value: 'glow', label: getTranslate('loadingPreview.glow') },
  { value: 'waves', label: getTranslate('loadingPreview.waves') },
];

const positionOptions = [
  { value: 'center', label: getTranslate('loadingPreview.center') },
  { value: 'top-left', label: getTranslate('loadingPreview.topLeft') },
  { value: 'top-right', label: getTranslate('loadingPreview.topRight') },
  { value: 'bottom-left', label: getTranslate('loadingPreview.bottomLeft') },
  { value: 'bottom-right', label: getTranslate('loadingPreview.bottomRight') },
];

export default function LoadingAnimationConfig({
  title,
  config,
  onChange,
  showPosition = false,
}: LoadingAnimationConfigProps) {
  const { t } = useI18n();
  return (
    <div className="p-4 bg-zinc-50 rounded-xl">
      <h3 className="text-sm font-bold text-zinc-700 mb-3">{title}</h3>
      <div className={`grid grid-cols-1 ${showPosition ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-500">{t('loadingPreview.animationType')}</label>
          <Select
            value={config.type}
            onChange={e => onChange({ ...config, type: e.target.value as LoadingConfig['type'] })}
            rounded="md"
          >
            {loadingTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-500">{t('loadingPreview.colorLabel')}</label>
          <ColorPicker
            value={config.color}
            onChange={(c: Color) => onChange({ ...config, color: c.toHexString() })}
            showText
          />
        </div>
        {showPosition && config.position && (
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">{t('components.loadingAnimationConfig.position')}</label>
            <Select
              value={config.position}
              onChange={e => onChange({ ...config, position: e.target.value as LoadingConfig['position'] })}
              rounded="md"
            >
              {positionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
