/**
 * 错误消息展示工具
 * 提供带一键复制功能的错误提示
 */

import { message } from 'antd';
import { Button } from '@/components/ui/Button';
import { Clipboard } from 'lucide-react';
import { getTranslate } from '@/i18n/translate';

const copiedKey = 'copied-feedback';

export function showError(msg: string, duration = 4) {
  const key = `error-${Date.now()}`;
  message.error({
    content: (
      <span>
        {msg}
        <Button
          variant="ghost"
          size="sm"
          rounded="sm"
          className="ml-3"
          autoLoading={false}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(msg).then(() => {
              message.success({ content: getTranslate('common.copiedToClipboard'), key: copiedKey, duration: 1.5 });
            }).catch(() => {
              message.error({ content: getTranslate('lib.error.copyFailed'), key: copiedKey, duration: 1.5 });
            });
          }}
          title={getTranslate('lib.error.clickToCopy')}
        >
          <Clipboard size={14} className="inline-block mr-1" />
          {getTranslate('lib.error.copy')}
        </Button>
      </span>
    ),
    key,
    duration,
  });
}