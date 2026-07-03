'use client';

import { Modal } from 'antd';
import { getConfirmMessage } from '@/lib/kaomoji';

/**
 * 显示可爱的退出登录确认弹窗
 *
 * @returns Promise<boolean> 用户是否确认退出
 */
export function showCuteLogoutConfirm(): Promise<boolean> {
  return new Promise((resolve) => {
    const msg = getConfirmMessage('logout');
    Modal.confirm({
      title: (
        <span className="flex items-center gap-2">
          <span className="text-xl">{msg.kaomoji}</span>
          <span>{msg.text}</span>
        </span>
      ),
      content: '确定要退出登录吗？',
      okText: '再见啦',
      cancelText: '再留一会儿',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
