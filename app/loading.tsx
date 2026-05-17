'use client';

import { useEffect, useState } from 'react';
import { GlobalLoading } from '@/components/Loading';

export default function Loading() {
  const [slogans, setSlogans] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    const cached = sessionStorage.getItem('loading-slogans');
    if (cached) {
      try { setSlogans(JSON.parse(cached)); return; } catch { /* ignore */ }
    }
    fetch('/api/site-config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const list = data?.appearance?.loading?.slogans;
        if (Array.isArray(list) && list.length > 0) {
          setSlogans(list);
          try { sessionStorage.setItem('loading-slogans', JSON.stringify(list)); } catch { /* ignore */ }
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading forNavigation slogans={slogans} />
    </div>
  );
}
