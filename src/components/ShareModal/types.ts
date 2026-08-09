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
