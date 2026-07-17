// FooterBrand - 品牌运行时信息（心跳 + 在线/休息状态 + 运行天数）
// 品牌活跃度的可视化表达。

'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

import { Tag } from '@/components/ui/Tag';

export interface FooterRuntimeStatusProps {
  launchTime: string;
  enable: boolean;
  timeFormat?: string;
  onlineHours?: { start: number; end: number };
  statusText?: { online: string; offline: string };
}

/**
 * 运行时状态：每秒刷新运行时间，并根据本地小时数显示在线/休息中标签。
 * 用 React.memo 包裹，防止父组件重渲染时连带重渲染此组件
 * （内部有每秒 setInterval 触发 setState）。
 */
export const FooterRuntimeStatus = React.memo(function FooterRuntimeStatus({
  launchTime,
  enable,
  timeFormat = '本站已运行 {days} 天 {hours} 小时 {minutes} 分 {seconds} 秒',
  onlineHours = { start: 9, end: 18 },
  statusText = { online: '在线', offline: '休息中' },
}: FooterRuntimeStatusProps) {
  const [text, setText] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!enable || !launchTime) return;
    const launch = new Date(launchTime);
    if (isNaN(launch.getTime())) return;

    const update = () => {
      const now = new Date();
      const diff = now.getTime() - launch.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setText(
        timeFormat
          .replace('{days}', String(days))
          .replace('{hours}', String(hours))
          .replace('{minutes}', String(minutes))
          .replace('{seconds}', String(seconds)),
      );

      const hour = now.getHours();
      setIsOnline(hour >= onlineHours.start && hour < onlineHours.end);
    };

    update();
    let timer = setInterval(update, 1000);

    // 页面不可见时暂停定时器，恢复时重置，避免后台累积触发
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        update();
        timer = setInterval(update, 1000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enable, launchTime, timeFormat, onlineHours]);

  if (!text) return null;

  return (
    <div className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400 gap-2">
      <Heart className="w-4 h-4 text-red-400 animate-pulse" />
      <span>{text}</span>
      <Tag
        variant="light"
        size="sm"
        className={isOnline ? 'bg-green-100 text-green-700 border-green-200' : ''}
      >
        {isOnline ? statusText.online : statusText.offline}
      </Tag>
    </div>
  );
});

export default FooterRuntimeStatus;
