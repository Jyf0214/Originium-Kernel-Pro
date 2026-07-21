import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SidebarHeaderProps {
  showCloseButton?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

export default function SidebarHeader({ showCloseButton, onClose, collapsed }: SidebarHeaderProps) {
  return (
    <div className={`${collapsed ? 'px-3 justify-center' : 'px-5 justify-between'} py-6 flex items-center border-b border-zinc-50/50 dark:border-zinc-800/50`}>
      <Link href="/" className="flex items-center gap-3 group no-underline">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-zinc-200 dark:shadow-zinc-700 group-hover:scale-105 transition-transform duration-300 shrink-0 ui-interactive">
          <Image
            src="/favicon.svg"
            alt="网站图标"
            width={36}
            height={36}
            unoptimized
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 leading-none mb-0.5">
              Originium
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              Kernel
            </span>
          </div>
        )}
      </Link>
      {showCloseButton && onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          iconOnly
          icon={<X size={18} />}
          aria-label="关闭侧边栏"
        />
      )}
    </div>
  );
}
