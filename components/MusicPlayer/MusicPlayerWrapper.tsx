'use client';

import dynamic from 'next/dynamic';

const MusicPlayer = dynamic(
  () => import('./index').then((m) => ({ default: m.MusicPlayer })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl h-32" />,
  },
);

export function MusicPlayerWrapper() {
  return <MusicPlayer />;
}
