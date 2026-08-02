'use client';

import { Modal } from 'antd';
import { getConfirmMessage } from '@/lib/kaomoji';
import { getTranslate } from '@/i18n/translate';

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
      content: getTranslate('components.CuteLogout.confirmContent'),
      okText: getTranslate('components.CuteLogout.okText'),
      cancelText: getTranslate('components.CuteLogout.cancelText'),
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
