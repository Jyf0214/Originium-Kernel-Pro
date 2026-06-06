import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MobileToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MobileToggle({ isOpen, onClick }: MobileToggleProps) {
  if (isOpen) return null;

  return (
    <Button
      variant="primary"
      onClick={onClick}
      className="md:hidden fixed top-6 left-6 z-[9999] rounded-2xl p-3.5 shadow-2xl shadow-zinc-900/20 hover:scale-110 active:scale-95"
    >
      <Menu size={22} />
    </Button>
  );
}
