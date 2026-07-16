import { Loader2 } from 'lucide-react';

/**
 * 加载状态旋转图标 — 提取为独立组件以减少 Button 主组件复杂度
 */
export function LoadingSpinner() {
  return <Loader2 size={16} className="animate-spin" />;
}
