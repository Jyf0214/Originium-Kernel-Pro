import React from 'react';
import Button from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import FormField from './FormField';
import ToggleField from './ToggleField';
import { useI18n } from '@/hooks/use-i18n';

interface NavMenuItemData {
  id?: string;
  name: string;
  link: string;
  icon?: string;
}

interface NavMenuGroupData {
  id?: string;
  title: string;
  item: NavMenuItemData[];
}

interface NavConfigData {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroupData[];
}

interface NavConfigProps {
  config: NavConfigData;
  onChange: (config: NavConfigData) => void;
}

export default function NavConfig({ config, onChange }: NavConfigProps) {
  const { t } = useI18n();
  const updateMenu = (menu: NavMenuGroupData[]) => onChange({ ...config, menu });

  const addGroup = () => {
    updateMenu([...config.menu, { id: crypto.randomUUID(), title: '', item: [] }]);
  };

  const removeGroup = (gi: number) => {
    updateMenu(config.menu.filter((_, i) => i !== gi));
  };

  const updateGroup = (gi: number, group: NavMenuGroupData) => {
    const next = [...config.menu];
    next[gi] = group;
    updateMenu(next);
  };

  const addItem = (gi: number) => {
    const group = config.menu[gi]!;
    updateGroup(gi, { ...group, item: [...group.item, { id: crypto.randomUUID(), name: '', link: '', icon: '' }] });
  };

  const removeItem = (gi: number, ii: number) => {
    const group = config.menu[gi]!;
    updateGroup(gi, { ...group, item: group.item.filter((_, i) => i !== ii) });
  };

  const updateItem = (gi: number, ii: number, item: NavMenuItemData) => {
    const group = config.menu[gi]!;
    const items = [...group.item];
    items[ii] = item;
    updateGroup(gi, { ...group, item: items });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label={t('components.NavConfig.enableNav')}
        description={t('components.NavConfig.hideMenuHint')}
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div className="flex gap-4">
        <ToggleField
          label={t('components.NavConfig.travelMode')}
          description={t('components.NavConfig.travelModeHint')}
          checked={config.travelling}
          onChange={v => onChange({ ...config, travelling: v })}
        />
        <ToggleField
          label={t('components.NavConfig.showClock')}
          description={t('components.NavConfig.showClockHint')}
          checked={config.clock}
          onChange={v => onChange({ ...config, clock: v })}
        />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">{t('components.NavConfig.navMenu')}</label>
          <Button size="sm" icon={<Plus size={14} />} onClick={addGroup} autoLoading={false}>
            {t('components.NavConfig.addGroup')}
          </Button>
        </div>

        {config.menu.length === 0 && (
          <p className="text-sm text-zinc-400 py-4 text-center bg-zinc-50 rounded-xl">
            {t('components.NavConfig.noGroups')}
          </p>
        )}

        {config.menu.map((group, gi) => (
          <div key={group.id ?? gi} className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <FormField
                  label={t('components.NavConfig.groupTitle')}
                  value={group.title}
                  onChange={v => updateGroup(gi, { ...group, title: v })}
                  placeholder={t('components.NavConfig.groupTitlePlaceholder')}
                />
              </div>
              <Button
                variant="danger"
                size="sm"
                iconOnly
                icon={<Trash2 size={16} />}
                onClick={() => removeGroup(gi)}
                autoLoading={false}
                title={t('components.NavConfig.deleteGroup')}
                className="mt-6"
              />
            </div>

            <div className="space-y-2">
              {group.item.map((item, ii) => (
                <div key={item.id ?? ii} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(gi, ii, { ...item, name: e.target.value })}
                      placeholder={t('components.NavConfig.name')}
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={item.link}
                      onChange={e => updateItem(gi, ii, { ...item, link: e.target.value })}
                      placeholder={t('components.NavConfig.link')}
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                    <input
                      type="text"
                      value={item.icon ?? ''}
                      onChange={e => updateItem(gi, ii, { ...item, icon: e.target.value })}
                      placeholder={t('components.NavConfig.iconUrl')}
                      className="h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={<Trash2 size={14} />}
                    onClick={() => removeItem(gi, ii)}
                    autoLoading={false}
                    title={t('components.NavConfig.deleteMenuItem')}
                    className="shrink-0"
                  />
                </div>
              ))}
              <Button variant="secondary" size="sm" block icon={<Plus size={12} />} onClick={() => addItem(gi)} autoLoading={false} rounded="sm">
                {t('components.NavConfig.addMenuItem')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
