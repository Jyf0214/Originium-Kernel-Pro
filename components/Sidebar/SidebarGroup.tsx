import { ChevronDown } from 'lucide-react';
import SidebarItem from './SidebarItem';
import { groupKeys } from './sidebar-config';
import type { MenuItem } from './types';

interface SidebarGroupProps {
  group: string;
  items: MenuItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onItemClick: () => void;
  t: (key: string) => string;
}

export default function SidebarGroup({
  group,
  items,
  isCollapsed,
  onToggle,
  isActive,
  onItemClick,
  t,
}: SidebarGroupProps) {
  const isAdminGroup = group === 'admin';
  const getGroupLabel = (g: string) => t(groupKeys[g] ?? g);

  return (
    <div className="space-y-1.5">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 mb-1 group/title"
      >
        <span
          className={`text-[10px] font-black uppercase tracking-[0.2em] ${
            isAdminGroup ? 'text-amber-500' : 'text-zinc-300'
          }`}
        >
          {getGroupLabel(group)}
        </span>
        <ChevronDown
          size={12}
          className={`text-zinc-200 transition-transform duration-300 ${
            isCollapsed ? '-rotate-90' : ''
          }`}
        />
      </button>

      {!isCollapsed && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              isAdminGroup={isAdminGroup}
              onItemClick={onItemClick}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
