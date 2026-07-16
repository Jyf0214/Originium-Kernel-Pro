/**
 * Callout 提示框组件
 * 解析 > [!NOTE] / [!TIP] / [!WARNING] / [!DANGER] 语法的 blockquote，
 * 渲染为带图标和颜色的提示框。
 */
import { type ReactNode } from 'react';
import { Info, AlertTriangle, Lightbulb, Flame } from 'lucide-react';

/* ── 提示框样式配置 ── */

const CALLOUT_STYLES: Record<string, { icon: ReactNode; bg: string; border: string; iconColor: string }> = {
  note:    { icon: <Info size={18} />,              bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',    iconColor: 'text-blue-600 dark:text-blue-400' },
  tip:     { icon: <Lightbulb size={18} />,          bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  warning: { icon: <AlertTriangle size={18} />,      bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800',  iconColor: 'text-amber-600 dark:text-amber-400' },
  danger:  { icon: <Flame size={18} />,              bg: 'bg-red-50 dark:bg-red-950/30',      border: 'border-red-200 dark:border-red-800',      iconColor: 'text-red-600 dark:text-red-400' },
};

const CALLOUT_DEFAULT = CALLOUT_STYLES.note;

/* ── 工具函数 ── */

/** 从 ReactNode 中递归提取纯文本 */
function extractPlainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractPlainText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractPlainText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/* ── 主组件 ── */

/** 解析 > [!NOTE] 语法的 blockquote → callout 提示框 */
export function CalloutBlock({ children }: { children: ReactNode }) {
  // 从 children 中提取文本，匹配 > [!type] 模式
  const text = extractPlainText(children);
  const match = /^\[!(note|tip|warning|danger)\]\s*/i.exec(text);
  if (!match) {
    // 非 callout 语法，保持原始 blockquote 样式
    return <blockquote>{children}</blockquote>;
  }

  const type = (match[1] ?? 'note').toLowerCase();
  const style = (CALLOUT_STYLES[type] ?? CALLOUT_DEFAULT) as { icon: ReactNode; bg: string; border: string; iconColor: string };
  // 移除 [!TYPE] 前缀后的纯内容
  const content = text.replace(/^\[!(?:note|tip|warning|danger)\]\s*/i, '');

  return (
    <div className={`my-6 flex gap-3 rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>{style.icon}</div>
      <div className="min-w-0 text-sm leading-relaxed">{content}</div>
    </div>
  );
}
