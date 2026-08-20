import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { getTranslate } from '@/i18n/translate';
import { useI18n } from '@/hooks/use-i18n';
import ToggleField from './ToggleField';

interface CoverConfigData {
  indexEnable: boolean;
  asideEnable: boolean;
  archivesEnable: boolean;
  position: 'left' | 'right' | 'both';
  defaultCover: string[];
}

interface CoverConfigProps {
  config: CoverConfigData;
  onChange: (config: CoverConfigData) => void;
}

const positionOptions = [
  { value: 'left', label: getTranslate('components.CoverConfig.positionLeft') },
  { value: 'right', label: getTranslate('components.CoverConfig.positionRight') },
  { value: 'both', label: getTranslate('components.CoverConfig.positionBoth') },
];

export default function CoverConfig({ config, onChange }: CoverConfigProps) {
  const { t } = useI18n();
  const [input, setInput] = React.useState('');

  const addCover = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (config.defaultCover.includes(trimmed)) return;
    onChange({ ...config, defaultCover: [...config.defaultCover, trimmed] });
    setInput('');
  };

  const removeCover = (url: string) => {
    onChange({ ...config, defaultCover: config.defaultCover.filter(x => x !== url) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ToggleField
          label={t('components.CoverConfig.showIndexCover')}
          checked={config.indexEnable}
          onChange={v => onChange({ ...config, indexEnable: v })}
        />
        <ToggleField
          label={t('components.CoverConfig.showAsideCover')}
          checked={config.asideEnable}
          onChange={v => onChange({ ...config, asideEnable: v })}
        />
        <ToggleField
          label={t('components.CoverConfig.showArchivesCover')}
          checked={config.archivesEnable}
          onChange={v => onChange({ ...config, archivesEnable: v })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">{t('components.CoverConfig.coverPosition')}</label>
        <Select
          value={config.position}
          onChange={e => onChange({ ...config, position: e.target.value as CoverConfigData['position'] })}
          rounded="md"
        >
          {positionOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">{t('components.CoverConfig.defaultCover')}</label>
        <div className="flex items-center gap-2 mb-3">
          <Input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCover()}
            placeholder={t('components.CoverConfig.coverPlaceholder')}
            size="sm"
            className="text-sm"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addCover} autoLoading={false} className="rounded-lg shrink-0">
            {t('components.CoverConfig.add')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.defaultCover.map(url => (
            <Tag key={url} onClose={() => removeCover(url)} variant="light" size="sm" className="max-w-[300px]">
              {url}
            </Tag>
          ))}
          {config.defaultCover.length === 0 && (
            <span className="text-xs text-zinc-400">{t('components.CoverConfig.noCovers')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
