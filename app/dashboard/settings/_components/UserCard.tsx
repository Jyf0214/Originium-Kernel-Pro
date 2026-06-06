'use client';

import { Avatar } from 'antd';
import { Check, User } from 'lucide-react';

/**
 * 用户信息卡片：头像 + 昵称 + 邮箱，左下角带绿色在线状态指示。
 */
export function UserCard({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-4">
      <div className="p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              size={72}
              src={avatarUrl ?? undefined}
              icon={!avatarUrl && <User size={28} />}
              className="bg-zinc-100 text-zinc-400 shrink-0 border-2 border-white shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900 mb-0.5">
              {displayName}
            </div>
            <div className="text-sm text-zinc-400">{email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
