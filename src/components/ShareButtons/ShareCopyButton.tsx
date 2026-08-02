import React from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getTranslate } from '@/i18n/translate';

/* ============================================================
   复制链接按钮
   ============================================================ */

export interface ShareCopyButtonProps {
  onClick: () => void;
}

export default function ShareCopyButton({ onClick }: ShareCopyButtonProps) {
  return (
    <Button
      variant="primary"
      size="md"
      iconOnly
      onClick={onClick}
      title={getTranslate('components.ShareButtons.copyLink')}
      aria-label={getTranslate('components.ShareButtons.copyLink')}
      autoLoading={false}
    >
      <Link2 size={18} />
    </Button>
  );
}
