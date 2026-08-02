'use client';

import { Popconfirm, type PopconfirmProps } from 'antd';
import { getConfirmMessage, type ConfirmCategory } from '@/lib/kaomoji';
import { useI18n } from '@/hooks/use-i18n';

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
  const { t } = useI18n();
  const msg = getConfirmMessage(category);
  const title = `${msg.kaomoji} ${confirmText ?? msg.text}`;

  return (
    <Popconfirm
      title={title}
      okText={okText ?? t('components.CuteConfirm.ok')}
      cancelText={cancelText ?? t('components.CuteConfirm.cancel')}
      okButtonProps={{ danger: true }}
      {...rest}
    >
      {children}
    </Popconfirm>
  );
}
