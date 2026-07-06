'use client';

import { useEffect, useState } from 'react';
import type {
  AppearanceConfig,
  ShareConfig,
  MainToneConfig,
  FooterConfig,
  HighlightConfig,
  CoverConfig,
  ErrorImgConfig,
  PostMetaConfig,
  WordCountConfig,
  TocConfig,
  CopyConfig,
  CopyrightConfig,
  RewardConfig,
  PostEditConfig,
  SiteConfig,
  AuthConfig,
  AvatarConfig,
  MusicConfig,
} from '@/lib/config-schema';

export interface FrontendConfig {
  share?: ShareConfig;
  mainTone?: MainToneConfig;
  footer?: FooterConfig;
  highlight?: HighlightConfig;
  cover?: CoverConfig;
  errorImg?: ErrorImgConfig;
  postMeta?: PostMetaConfig;
  wordcount?: WordCountConfig;
  toc?: TocConfig;
  copy?: CopyConfig;
  copyright?: CopyrightConfig;
  reward?: RewardConfig;
  postEdit?: PostEditConfig;
  site?: SiteConfig;
  auth?: AuthConfig;
  avatar?: AvatarConfig;
  music?: MusicConfig;
  appearance?: AppearanceConfig;
}

let cachedConfig: FrontendConfig | null = null;
let pendingPromise: Promise<FrontendConfig> | null = null;

export function useConfig(): {
  config: FrontendConfig | null;
  loading: boolean;
  error: string | null;
} {
  const [config, setConfig] = useState<FrontendConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    if (pendingPromise) {
      pendingPromise.then(setConfig).catch(e => setError(e.message)).finally(() => setLoading(false));
      return;
    }

    pendingPromise = fetch('/api/config')
      .then(res => {
        if (!res.ok) throw new Error('无法加载配置');
        return res.json();
      })
      .then((data: FrontendConfig) => {
        cachedConfig = data;
        return data;
      });

    pendingPromise.then(setConfig).catch(e => setError(e.message)).finally(() => {
      setLoading(false);
      pendingPromise = null;
    });
  }, []);

  return { config, loading, error };
}
