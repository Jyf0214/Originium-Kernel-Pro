/**
 * 错误消息展示工具
 * 提供带一键复制功能的错误提示
 */

import { message } from 'antd';
import React from 'react';

const copiedKey = 'copied-feedback';

export function showError(msg: string, duration = 4) {
  const key = `error-${Date.now()}`;
  message.error({
    content: (
      <span>
        {msg}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(msg).then(() => {
              message.success({ content: '已复制到剪贴板', key: copiedKey, duration: 1.5 });
            }).catch(() => {
              message.error({ content: '复制失败', key: copiedKey, duration: 1.5 });
            });
          }}
          style={{
            marginLeft: 12,
            padding: '2px 8px',
            border: '1px solid currentColor',
            borderRadius: 4,
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: 12,
          }}
          title="点击复制错误信息"
        >
          📋复制
        </button>
      </span>
    ),
    key,
    duration,
  });
}