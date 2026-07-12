'use client';

import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useBuildTimeAvatar } from '@/hooks/use-build-time-avatar';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';
import { Dropdown, type MenuProps } from 'antd';
import { Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showCuteLogoutConfirm } from '@/components/ui/CuteLogout';

export function UserMenu() {
  const { user, userRole, logout } = useAuth();
  const avatarUrl = useBuildTimeAvatar();
  const { t } = useI18n();
  const router = useRouter();

  const isSudo = userRole === 'sudo' || userRole === 'admin';
  const userUid = user?.uid ?? '';
  const displayName = user?.name ?? user?.displayName ?? 'User';

  const handleLogout = async () => {
    const confirmed = await showCuteLogoutConfirm();
    if (confirmed) {
      void logout();
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: <Settings size={14} />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('nav.logout'),
      icon: <LogOut size={14} />,
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'settings') {
      router.push('/dashboard/settings');
    } else if (key === 'logout') {
      void handleLogout();
    }
  };

  return (
    <div>
      <Dropdown
        menu={{ items, onClick: handleMenuClick }}
        trigger={['click']}
        placement="bottomRight"
        arrow
      >
        <Button variant="ghost" autoLoading={false} className="flex items-center gap-2">
          <Avatar name={displayName} avatarUrl={avatarUrl} size={36} />
          <div className="hidden md:block">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-tight">{displayName}</span>
              {isSudo && (
                <span className="text-xs text-amber-600 font-medium" style={{ borderRadius: 6 }}>
                  {t('user.sudo')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono leading-tight">{userUid}</span>
            </div>
          </div>
        </Button>
      </Dropdown>
    </div>
  );
}
