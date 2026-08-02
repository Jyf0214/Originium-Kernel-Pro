import React from 'react';
import Button from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

type SocialConfigData = Record<string, string>;

interface SocialConfigProps {
  config: SocialConfigData;
  onChange: (config: SocialConfigData) => void;
}

export default function SocialConfig({ config, onChange }: SocialConfigProps) {
  const { t } = useI18n();
  const entries = Object.entries(config);

  const addEntry = () => {
    const key = `social-${entries.length + 1}`;
    onChange({ ...config, [key]: '' });
  };

  const removeEntry = (key: string) => {
    const next = { ...config };
    delete next[key];
    onChange(next);
  };

  const updateKey = (oldKey: string, newKey: string) => {
    const next = { ...config };
    next[newKey] = next[oldKey] ?? '';
    if (newKey !== oldKey) delete next[oldKey];
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-zinc-400 py-4 text-center bg-zinc-50 rounded-xl">
          {t('components.socialConfig.noLinks')}
        </p>
      )}

      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <input
            type="text"
            value={key}
            onChange={e => updateKey(key, e.target.value)}
            placeholder={t('components.socialConfig.namePlaceholder')}
            className="w-[140px] h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <input
            type="text"
            value={value}
            onChange={e => updateValue(key, e.target.value)}
            placeholder={t('components.socialConfig.linkPlaceholder')}
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button
            variant="danger"
            size="sm"
            iconOnly
            icon={<Trash2 size={14} />}
            onClick={() => removeEntry(key)}
            autoLoading={false}
            className="shrink-0"
          />
        </div>
      ))}

      <Button size="sm" icon={<Plus size={14} />} onClick={addEntry} autoLoading={false}>
        {t('components.socialConfig.addLink')}
      </Button>
      <p className="text-xs text-zinc-400">{t('components.socialConfig.formatHint')}</p>
    </div>
  );
}
