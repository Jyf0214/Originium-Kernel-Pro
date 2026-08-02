import React from 'react';
import { Select } from 'antd';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface PostMetaItemConfig {
  dateType: string;
  dateFormat: string;
  categories: boolean;
  tags: boolean;
  label: boolean;
}

interface PostMetaPostConfig extends PostMetaItemConfig {
  unread: boolean;
}

interface PostMetaConfigData {
  page: PostMetaItemConfig & { dateFormat: string };
  post: PostMetaPostConfig;
}

interface PostMetaConfigProps {
  config: PostMetaConfigData;
  onChange: (config: PostMetaConfigData) => void;
}

function MetaItemEditor({
  prefix,
  config,
  onChange,
  showUnread,
}: {
  prefix: string;
  config: PostMetaItemConfig;
  onChange: (c: PostMetaItemConfig) => void;
  showUnread?: boolean;
}) {
  const { t } = useI18n();

  const dateTypeOptions = [
    { value: 'created', label: t('components.PostMetaConfig.createdAt') },
    { value: 'updated', label: t('components.PostMetaConfig.updatedAt') },
    { value: 'both', label: t('components.PostMetaConfig.showBoth') },
  ];

  const dateFormatOptions = [
    { value: 'date', label: t('components.PostMetaConfig.standardDate') },
    { value: 'relative', label: t('components.PostMetaConfig.relativeDate') },
    { value: 'simple', label: t('components.PostMetaConfig.simpleDate') },
  ];

  const postDateFormatOptions = [
    { value: 'date', label: t('components.PostMetaConfig.standardDate') },
    { value: 'relative', label: t('components.PostMetaConfig.relativeDate') },
  ];

  return (
    <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{prefix}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">{t('components.PostMetaConfig.dateType')}</label>
          <Select
            size="small"
            value={config.dateType}
            onChange={v => onChange({ ...config, dateType: v })}
            options={dateTypeOptions}
            style={{ width: '100%' }}
            className="!rounded-lg"
            placement="bottomLeft"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('components.PostMetaConfig.dateFormat')}</label>
          <Select
            size="small"
            value={config.dateFormat}
            onChange={v => onChange({ ...config, dateFormat: v })}
            options={prefix === t('components.PostMetaConfig.homePage') ? dateFormatOptions : postDateFormatOptions}
            style={{ width: '100%' }}
            className="!rounded-lg"
            placement="bottomLeft"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ToggleField label={t('components.PostMetaConfig.showCategories')} checked={config.categories} onChange={v => onChange({ ...config, categories: v })} />
        <ToggleField label={t('components.PostMetaConfig.showTags')} checked={config.tags} onChange={v => onChange({ ...config, tags: v })} />
        <ToggleField label={t('components.PostMetaConfig.showDescription')} checked={config.label} onChange={v => onChange({ ...config, label: v })} />
        {showUnread && (
          <ToggleField label={t('components.PostMetaConfig.unreadMarker')} checked={(config as PostMetaPostConfig).unread} onChange={v => onChange({ ...config, unread: v } as unknown as PostMetaItemConfig)} />
        )}
      </div>
    </div>
  );
}

export default function PostMetaConfig({ config, onChange }: PostMetaConfigProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <MetaItemEditor
        prefix={t('components.PostMetaConfig.homePage')}
        config={config.page}
        onChange={v => onChange({ ...config, page: { ...v, dateFormat: v.dateFormat } })}
      />
      <MetaItemEditor
        prefix={t('components.PostMetaConfig.postPage')}
        config={config.post}
        onChange={v => onChange({ ...config, post: v as PostMetaPostConfig })}
        showUnread
      />
    </div>
  );
}
