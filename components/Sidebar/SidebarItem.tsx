import Link from 'next/link';
import type { MenuItem } from './types';

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  isAdminGroup: boolean;
  onItemClick: () => void;
  t: (key: string) => string;
}

export default function SidebarItem({
  item,
  isActive,
  isAdminGroup,
  onItemClick,
  t,
}: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onItemClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group/item no-underline ${
        isActive
          ? isAdminGroup
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-100/50 dark:shadow-amber-900/20'
            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-zinc-400/20'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-colors ${
          isActive
            ? isAdminGroup
              ? 'text-amber-600'
              : 'text-white'
            : 'text-zinc-300 dark:text-zinc-600 group-hover/item:text-zinc-500 dark:group-hover/item:text-zinc-400'
        }`}
      />
      <span className={`truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
        {t(item.key)}
      </span>
      {isActive && !isAdminGroup && (
        <div className="ml-auto w-1 h-4 bg-white/20 dark:bg-zinc-900/20 rounded-full" />
      )}
    </Link>
  );
}
