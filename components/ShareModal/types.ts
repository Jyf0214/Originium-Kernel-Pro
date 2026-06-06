import type { ReactNode } from 'react';

/* ============================================================
   平台定义
   ============================================================ */

export interface PlatformDef {
  id: string;
  name: string;
  color: string;
  hoverColor: string;
  icon: ReactNode;
  shareUrl: (url: string, title: string) => string | null;
}

/* ============================================================
   Props
   ============================================================ */

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  platforms?: string[];
}
