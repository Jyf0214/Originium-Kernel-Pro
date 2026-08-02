import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getTranslate } from '@/i18n/translate';

/* ============================================================
   「更多」按钮 — 触发 ShareModal
   ============================================================ */

export interface ShareMoreButtonProps {
  onClick: () => void;
  /** 控制内部图标大小；sm → 16，md → 20 */
  size?: 'sm' | 'md';
}

export default function ShareMoreButton({ onClick, size = 'md' }: ShareMoreButtonProps) {
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      onClick={onClick}
      title={getTranslate('components.ShareButtons.moreShareMethods')}
      aria-label={getTranslate('components.ShareButtons.moreShareMethods')}
      autoLoading={false}
    >
      <MoreHorizontal size={iconSize} />
    </Button>
  );
}
