'use client';

import { motion } from 'motion/react';
import { DURATION, EASE_STANDARD } from '@/components/ui/motion';
import type { User } from '@/hooks/use-auth';
import type { TFunc } from '@/i18n/keys';

/** 仪表盘欢迎语区域(用户名 + 控制台描述) */
export function DashboardHeader({ user, t }: { user: User | null; t: TFunc }) {
  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.MID, ease: EASE_STANDARD }}
    >
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          {t('dashboard.welcomeBack')}{user?.name ? `，${user.name}` : ''}
        </h1>
      </div>
      <p className="text-zinc-400 dark:text-zinc-500 text-base">
        {t('dashboard.contentConsole')}
      </p>
    </motion.div>
  );
}
