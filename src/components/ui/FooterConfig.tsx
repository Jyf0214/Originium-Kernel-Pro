import React from 'react';
import ToggleField from './ToggleField';
import FormField from './FormField';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface SocialLinkItem {
  name: string;
  icon: string;
}

interface FooterLinkItem {
  name: string;
  url: string;
}

interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

interface BadgeItem {
  name: string;
  url: string;
}

interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
  timeFormat?: string;
  onlineHours?: { start: number; end: number };
  statusText?: { online: string; offline: string };
}

interface FooterConfigData {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
  socialLinks?: SocialLinkItem[];
  links?: FooterLinkGroup[];
  badges?: BadgeItem[];
  typedTextPrefix?: string;
  typedText?: string[];
  typedTextSpeed?: { type: number; delete: number; pause: number };
  scrollToTopText?: string;
}

interface FooterConfigProps {
  config: FooterConfigData;
  onChange: (config: FooterConfigData) => void;
}

export default function FooterConfig({ config, onChange }: FooterConfigProps) {
  const { t } = useI18n();
  const socialLinks = config.socialLinks ?? [];
  const links = config.links ?? [];
  const badges = config.badges ?? [];
  const typedText = config.typedText ?? [];

  return (
    <div className="space-y-6">
      {/* {t('components.FooterConfig.ownerInfo')} */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.ownerInfo')}</h3>
        <ToggleField
          label={t('components.FooterConfig.showCopyright')}
          checked={config.owner.enable}
          onChange={v => onChange({ ...config, owner: { ...config.owner, enable: v } })}
        />
        <FormField
          label={t('components.FooterConfig.startYear')}
          value={String(config.owner.since)}
          onChange={v => onChange({ ...config, owner: { ...config.owner, since: parseInt(v) || 2026 } })}
          placeholder="2026"
        />
        <FormField
          label={t('components.FooterConfig.authorName')}
          value={config.owner.author ?? ''}
          onChange={v => onChange({ ...config, owner: { ...config.owner, author: v } })}
          placeholder={t('components.FooterConfig.authorPlaceholder')}
        />
      </div>

      {/* {t('components.FooterConfig.customText')} */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.customText')}</h3>
        <FormField
          label={t('components.FooterConfig.customFooterText')}
          value={config.customText}
          onChange={v => onChange({ ...config, customText: v })}
          placeholder={t('components.FooterConfig.customFooterTextPlaceholder')}
        />
      </div>

      {/* {t('components.FooterConfig.runtime')} */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.runtime')}</h3>
        <ToggleField
          label={t('components.FooterConfig.showRuntime')}
          description={t('components.FooterConfig.showRuntimeDesc')}
          checked={config.runtime.enable}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, enable: v } })}
        />
        <FormField
          label={t('components.FooterConfig.launchTime')}
          value={config.runtime.launchTime}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, launchTime: v } })}
          placeholder="04/01/2021 00:00:00"
        />
      </div>

      {/* 社交链接 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.socialIcons')}</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, socialLinks: [...socialLinks, { name: '', icon: '' }] })}
          >
            <Plus size={14} /> {t('components.FooterConfig.add')}
          </button>
        </div>
        {socialLinks.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <FormField
              label=""
              value={item.name}
              onChange={v => {
                const next = [...socialLinks];
                const s = next[idx]!;
                next[idx] = { name: v, icon: s.icon };
                onChange({ ...config, socialLinks: next });
              }}
              placeholder={t('components.FooterConfig.socialNamePlaceholder')}
            />
            <FormField
              label=""
              value={item.icon}
              onChange={v => {
                const next = [...socialLinks];
                const s = next[idx]!;
                next[idx] = { name: s.name, icon: v };
                onChange({ ...config, socialLinks: next });
              }}
              placeholder={t('components.FooterConfig.socialIconPlaceholder')}
            />
            <button
              type="button"
              className="mt-1 p-1 text-zinc-400 hover:text-red-500 shrink-0"
              onClick={() => onChange({ ...config, socialLinks: socialLinks.filter((_, i) => i !== idx) })}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* {t('components.FooterConfig.footerLinks')} */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.footerLinks')}</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, links: [...links, { group: '', items: [] }] })}
          >
            <Plus size={14} /> {t('components.FooterConfig.addGroup')}
          </button>
        </div>
        {links.map((group, gIdx) => (
          <div key={gIdx} className="border border-zinc-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FormField
                label=""
                value={group.group}
                onChange={v => {
                const next = [...links];
                const g = next[gIdx]!;
                next[gIdx] = { group: v, items: g.items };
                onChange({ ...config, links: next });
              }}
              placeholder={t('components.FooterConfig.groupNamePlaceholder')}
              />
              <button
                type="button"
                className="p-1 text-zinc-400 hover:text-red-500 shrink-0"
                onClick={() => onChange({ ...config, links: links.filter((_, i) => i !== gIdx) })}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {group.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-2 pl-4">
                <FormField
                  label=""
                  value={item.name}
                  onChange={v => {
                    const next = [...links];
                    const g = next[gIdx]!;
                    const items = [...g.items];
                    items[iIdx] = { name: v, url: items[iIdx]!.url };
                    next[gIdx] = { group: g.group, items };
                    onChange({ ...config, links: next });
                  }}
                  placeholder={t('components.FooterConfig.linkName')}
                />
                <FormField
                  label=""
                  value={item.url}
                  onChange={v => {
                    const next = [...links];
                    const g = next[gIdx]!;
                    const items = [...g.items];
                    items[iIdx] = { name: items[iIdx]!.name, url: v };
                    next[gIdx] = { group: g.group, items };
                    onChange({ ...config, links: next });
                  }}
                  placeholder={t('components.FooterConfig.linkUrl')}
                />
                <button
                  type="button"
                  className="p-1 text-zinc-400 hover:text-red-500 shrink-0"
                  onClick={() => {
                    const next = [...links];
                    const g = next[gIdx]!;
                    next[gIdx] = { group: g.group, items: g.items.filter((_, i) => i !== iIdx) };
                    onChange({ ...config, links: next });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 pl-4"
              onClick={() => {
                const next = [...links];
                const g = next[gIdx]!;
                next[gIdx] = { group: g.group, items: [...g.items, { name: '', url: '' }] };
                onChange({ ...config, links: next });
              }}
            >
              <Plus size={12} /> 添加链接
            </button>
          </div>
        ))}
      </div>

      {/* {t('components.FooterConfig.badges')} */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.badges')}</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, badges: [...badges, { name: '', url: '' }] })}
          >
            <Plus size={14} /> {t('components.FooterConfig.add')}
          </button>
        </div>
        {badges.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <FormField
              label=""
              value={item.name}
              onChange={v => {
                const next = [...badges];
                const b = next[idx]!;
                next[idx] = { name: v, url: b.url };
                onChange({ ...config, badges: next });
              }}
              placeholder={t('components.FooterConfig.badgeName')}
            />
            <FormField
              label=""
              value={item.url}
              onChange={v => {
                const next = [...badges];
                const b = next[idx]!;
                next[idx] = { name: b.name, url: v };
                onChange({ ...config, badges: next });
              }}
              placeholder={t('components.FooterConfig.badgeImage')}
            />
            <button
              type="button"
              className="mt-1 p-1 text-zinc-400 hover:text-red-500 shrink-0"
              onClick={() => onChange({ ...config, badges: badges.filter((_, i) => i !== idx) })}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* {t('components.FooterConfig.typingAnimation')} */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.typingAnimation')}</h3>
        <FormField
          label={t('components.FooterConfig.prefixText')}
          value={config.typedTextPrefix ?? ''}
          onChange={v => onChange({ ...config, typedTextPrefix: v })}
          placeholder={t('components.FooterConfig.prefixPlaceholder')}
        />
        <FormField
          label={t('components.FooterConfig.typingContent')}
          value={typedText.join('\n')}
          onChange={v => onChange({ ...config, typedText: v.split('\n').filter(s => s.trim()) })}
          type="textarea"
          rows={4}
          placeholder={t('components.FooterConfig.typingContentPlaceholder')}
        />
        <div className="grid grid-cols-3 gap-3">
          <FormField
            label={t('components.FooterConfig.typingSpeed')}
            value={String(config.typedTextSpeed?.type ?? 100)}
            onChange={v => onChange({ ...config, typedTextSpeed: { ...config.typedTextSpeed, type: parseInt(v) || 100, delete: config.typedTextSpeed?.delete ?? 50, pause: config.typedTextSpeed?.pause ?? 2000 } })}
            placeholder="100"
          />
          <FormField
            label={t('components.FooterConfig.deleteSpeed')}
            value={String(config.typedTextSpeed?.delete ?? 50)}
            onChange={v => onChange({ ...config, typedTextSpeed: { ...config.typedTextSpeed, type: config.typedTextSpeed?.type ?? 100, delete: parseInt(v) || 50, pause: config.typedTextSpeed?.pause ?? 2000 } })}
            placeholder="50"
          />
          <FormField
            label={t('components.FooterConfig.pauseTime')}
            value={String(config.typedTextSpeed?.pause ?? 2000)}
            onChange={v => onChange({ ...config, typedTextSpeed: { ...config.typedTextSpeed, type: config.typedTextSpeed?.type ?? 100, delete: config.typedTextSpeed?.delete ?? 50, pause: parseInt(v) || 2000 } })}
            placeholder="2000"
          />
        </div>
      </div>

      {/* 回到顶部 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('components.FooterConfig.other')}</h3>
        <FormField
          label={t('components.FooterConfig.scrollToTopHint')}
          value={config.scrollToTopText ?? t('components.FooterConfig.scrollToTopPlaceholder')}
          onChange={v => onChange({ ...config, scrollToTopText: v })}
          placeholder={t('components.FooterConfig.scrollToTopPlaceholder')}
        />
      </div>
    </div>
  );
}
