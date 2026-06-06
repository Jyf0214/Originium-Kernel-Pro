import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SidebarHeaderProps {
  showCloseButton?: boolean;
  onClose?: () => void;
}

export default function SidebarHeader({ showCloseButton, onClose }: SidebarHeaderProps) {
  return (
    <div className="px-5 py-6 flex items-center justify-between border-b border-zinc-50/50">
      <Link href="/" className="flex items-center gap-3 group no-underline">
        <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 group-hover:scale-105 transition-transform duration-300">
          <span className="text-white font-black text-lg tracking-tighter">OK</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-zinc-900 leading-none mb-0.5">
            Originium
          </span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
            Kernel
          </span>
        </div>
      </Link>
      {showCloseButton && onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          iconOnly
          icon={<X size={18} />}
        />
      )}
    </div>
  );
}
