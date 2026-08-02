import React from 'react';
import { Tag } from 'antd';
import { Plus } from 'lucide-react';
import ToggleField from './ToggleField';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';

interface MournConfigData {
  enable: boolean;
  days: string[];
}

interface MournConfigProps {
  config: MournConfigData;
  onChange: (config: MournConfigData) => void;
}

export default function MournConfig({ config, onChange }: MournConfigProps) {
  const { t } = useI18n();
  const [input, setInput] = React.useState('');

  const addDay = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!/^\d{1,2}-\d{1,2}$/.test(trimmed)) return;
    if (config.days.includes(trimmed)) return;
    onChange({ ...config, days: [...config.days, trimmed] });
    setInput('');
  };

  const removeDay = (d: string) => {
    onChange({ ...config, days: config.days.filter(x => x !== d) });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label={t('components.MournConfig.enableMourning')}
        description={t('components.MournConfig.greyHomepage')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div>
        <label className="block text-sm font-medium mb-2">{t('components.MournConfig.mourningDate')}</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDay()}
            placeholder={t('components.MournConfig.dateExample')}
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addDay} autoLoading={false} className="rounded-lg shrink-0">
            {t('components.MournConfig.add')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.days.map(d => (
            <Tag key={d} closable onClose={() => removeDay(d)} className="rounded-lg text-sm">
              {d}
            </Tag>
          ))}
          {config.days.length === 0 && (
            <span className="text-xs text-zinc-400">{t('components.MournConfig.noDates')}</span>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-2">{t('components.MournConfig.exampleHint')}</p>
      </div>
    </div>
  );
}
