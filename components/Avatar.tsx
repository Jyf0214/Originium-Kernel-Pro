import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
}

export function Avatar({ name, avatarUrl, size = 32 }: AvatarProps) {
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-zinc-900 text-white font-bold overflow-hidden"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} width={size} height={size} className="object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
