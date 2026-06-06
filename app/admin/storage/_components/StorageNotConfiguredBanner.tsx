/**
 * WebDAV 未配置时的降级提示横幅
 *
 * 位于页面顶部,以 StatusCard 渲染。
 * 不阻塞页面渲染(其它模块仍可能可读),但明示上传/创建/删除已禁用。
 */
'use client';

import { XCircle } from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';

interface Props {
  message?: string;
}

export function StorageNotConfiguredBanner({ message }: Props) {
  return (
    <StatusCard
      icon={<XCircle size={20} />}
      title="WebDAV 未配置"
      status={
        message ??
        '请在 .env.local 中设置 WEBDAV_URL、WEBDAV_USER、WEBDAV_PASS 三个环境变量,然后重启服务。'
      }
      statusType="error"
      className="mb-4"
    />
  );
}

export default StorageNotConfiguredBanner;
