'use client';

import { useMemo } from 'react';
import { SITE_CONFIG } from '@/data/site-config';
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

export function useConfig(): {
  config: FrontendConfig | null;
  loading: boolean;
  error: string | null;
} {
  return useMemo(
    () => ({ config: SITE_CONFIG, loading: false, error: null }),
    [],
  );
}
