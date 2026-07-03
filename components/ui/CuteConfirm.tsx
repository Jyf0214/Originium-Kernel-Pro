'use client';

import { Popconfirm, type PopconfirmProps } from 'antd';
import { getConfirmMessage, type ConfirmCategory } from '@/lib/kaomoji';

/**
 * 可爱确认弹窗 — 包装 Ant Design Popconfirm，自动添加颜文字
 */
export interface CuteConfirmProps extends Omit<PopconfirmProps, 'title'> {
  /** 确认类别，决定显示哪类颜文字 */
  category?: ConfirmCategory;
  /** 自定义标题文案（覆盖类别默认值） */
  confirmText?: string;
}

export function CuteConfirm({
  category = 'general',
  confirmText,
  okText,
  cancelText,
  children,
  ...rest
}: CuteConfirmProps) {
  const msg = getConfirmMessage(category);
  const title = `${msg.kaomoji} ${confirmText ?? msg.text}`;

  return (
    <Popconfirm
      title={title}
      okText={okText ?? '确定'}
      cancelText={cancelText ?? '再想想'}
      okButtonProps={{ danger: true }}
      {...rest}
    >
      {children}
    </Popconfirm>
  );
}
