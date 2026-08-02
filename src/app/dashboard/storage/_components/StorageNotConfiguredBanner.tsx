/**
 * 存储后端未配置时的降级提示横幅
 *
 * 位于页面顶部,以 StatusCard 渲染。
 * 不阻塞页面渲染(其它模块仍可能可读),但明示上传/创建/删除已禁用。
 */
'use client';

import { XCircle } from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';
import { useI18n } from '@/hooks/use-i18n';

interface Props {
  message?: string;
}

export function StorageNotConfiguredBanner({ message }: Props) {
  const { t } = useI18n();
  return (
    <StatusCard
      icon={<XCircle size={20} />}
      title={t('storage.notConfiguredTitle')}
      status={
        message ??
        t('storage.notConfiguredBannerDesc')
      }
      statusType="error"
      className="mb-4"
    />
  );
}

export default StorageNotConfiguredBanner;
