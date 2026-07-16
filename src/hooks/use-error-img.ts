'use client';

import { useCallback, useRef } from 'react';
import { SITE_CONFIG } from '@/data/site-config';

interface ErrorImgConfig {
  flink: string;
  postPage: string;
}

const errorImgConfig: ErrorImgConfig = {
  flink: SITE_CONFIG.errorImg?.flink ?? '/img/friend_404.gif',
  postPage: SITE_CONFIG.errorImg?.postPage ?? '/img/404.jpg',
};

function getHandler(type: 'flink' | 'postPage'): (e: React.SyntheticEvent<HTMLImageElement>) => void {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (errorImgConfig[type]) {
      (e.target as HTMLImageElement).src = errorImgConfig[type];
    }
  };
}

export function useErrorImg() {
  const onPostErrorRef = useRef(getHandler('postPage'));
  const onFlinkErrorRef = useRef(getHandler('flink'));

  const onPostError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    onPostErrorRef.current(e);
  }, []);

  const onFlinkError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    onFlinkErrorRef.current(e);
  }, []);

  return {
    loaded: true,
    onPostError,
    onFlinkError,
  };
}
