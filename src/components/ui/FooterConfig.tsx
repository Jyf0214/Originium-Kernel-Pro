import React from 'react';
import ToggleField from './ToggleField';
import FormField from './FormField';
import { Plus, Trash2 } from 'lucide-react';

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
}

interface FooterConfigProps {
  config: FooterConfigData;
  onChange: (config: FooterConfigData) => void;
}

export default function FooterConfig({ config, onChange }: FooterConfigProps) {
  const socialLinks = config.socialLinks ?? [];
  const links = config.links ?? [];
  const badges = config.badges ?? [];
  const typedText = config.typedText ?? [];

  return (
    <div className="space-y-6">
      {/* 所有者信息 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">所有者信息</h3>
        <ToggleField
          label="显示版权信息"
          checked={config.owner.enable}
          onChange={v => onChange({ ...config, owner: { ...config.owner, enable: v } })}
        />
        <FormField
          label="起始年份"
          value={String(config.owner.since)}
          onChange={v => onChange({ ...config, owner: { ...config.owner, since: parseInt(v) || 2026 } })}
          placeholder="2026"
        />
        <FormField
          label="作者名称"
          value={config.owner.author ?? ''}
          onChange={v => onChange({ ...config, owner: { ...config.owner, author: v } })}
          placeholder="例如：ZhouZBoss"
        />
      </div>

      {/* 自定义文本 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">自定义文本</h3>
        <FormField
          label="自定义页脚文字"
          value={config.customText}
          onChange={v => onChange({ ...config, customText: v })}
          placeholder="例如：本站内容采用 CC BY-NC-SA 4.0 许可"
        />
      </div>

      {/* 运行时间 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">运行时间</h3>
        <ToggleField
          label="显示运行时间"
          description="显示网站已运行天数"
          checked={config.runtime.enable}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, enable: v } })}
        />
        <FormField
          label="网站上线时间"
          value={config.runtime.launchTime}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, launchTime: v } })}
          placeholder="04/01/2021 00:00:00"
        />
      </div>

      {/* 社交链接 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">社交图标</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, socialLinks: [...socialLinks, { name: '', icon: '' }] })}
          >
            <Plus size={14} /> 添加
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
              placeholder="名称（如 Github）"
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
              placeholder="图标（如 Github）"
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

      {/* 底部链接 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">底部链接</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, links: [...links, { group: '', items: [] }] })}
          >
            <Plus size={14} /> 添加分组
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
              placeholder="分组名称"
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
                  placeholder="名称"
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
                  placeholder="链接"
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

      {/* 徽章 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">徽章</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => onChange({ ...config, badges: [...badges, { name: '', url: '' }] })}
          >
            <Plus size={14} /> 添加
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
              placeholder="名称"
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
              placeholder="图片链接"
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

      {/* 打字动画 */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">打字动画</h3>
        <FormField
          label="前缀文本"
          value={config.typedTextPrefix ?? ''}
          onChange={v => onChange({ ...config, typedTextPrefix: v })}
          placeholder="例如：你好，我是 "
        />
        <FormField
          label="打字内容（每行一条，随机播放）"
          value={typedText.join('\n')}
          onChange={v => onChange({ ...config, typedText: v.split('\n').filter(s => s.trim()) })}
          type="textarea"
          rows={4}
          placeholder={'ZhouZBoss\n欢迎来访'}
        />
      </div>
    </div>
  );
}
