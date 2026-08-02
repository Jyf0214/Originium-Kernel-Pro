import React from 'react';
import { Tag } from 'antd';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { getTranslate } from '@/i18n/translate';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface AuthorStatusConfigData {
  enable: boolean;
  statusImg: string;
  skills: string[];
}

interface AuthorStatusConfigProps {
  config: AuthorStatusConfigData;
  onChange: (config: AuthorStatusConfigData) => void;
}

export default function AuthorStatusConfig({ config, onChange }: AuthorStatusConfigProps) {
  const [input, setInput] = React.useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (config.skills.includes(trimmed)) return;
    onChange({ ...config, skills: [...config.skills, trimmed] });
    setInput('');
  };

  const removeSkill = (s: string) => {
    onChange({ ...config, skills: config.skills.filter(x => x !== s) });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label={getTranslate('components.AuthorStatusConfig.enableCard')}
        description={getTranslate('components.AuthorStatusConfig.enableCardDesc')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <FormField
        label={getTranslate('components.AuthorStatusConfig.statusImageUrl')}
        value={config.statusImg}
        onChange={v => onChange({ ...config, statusImg: v })}
        placeholder="https://example.com/status.png"
      />

      <div>
        <label className="block text-sm font-medium mb-2">{getTranslate('components.AuthorStatusConfig.skillTags')}</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSkill()}
            placeholder={getTranslate('components.AuthorStatusConfig.skillPlaceholder')}
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addSkill} autoLoading={false} className="rounded-lg shrink-0">
            {getTranslate('components.AuthorStatusConfig.add')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.skills.map(s => (
            <Tag key={s} closable onClose={() => removeSkill(s)} className="rounded-lg text-sm">
              {s}
            </Tag>
          ))}
          {config.skills.length === 0 && (
            <span className="text-xs text-zinc-400">{getTranslate('components.AuthorStatusConfig.noSkills')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
