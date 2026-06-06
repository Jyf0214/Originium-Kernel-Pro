'use client';

import { useEffect, useState } from 'react';
import { showError } from '@/lib/error';
import type { RemoteConfigData } from './types';

export interface UseConfigDataResult {
  configData: RemoteConfigData | null;
  configLoaded: boolean;
  githubRepo: string;
}

/**
 * 页面加载时从 /api/config 拉取 GitHub 仓库与远程配置数据。
 * 不论成功或失败都会将 configLoaded 置为 true，以便上层继续渲染。
 */
export function useConfigData(): UseConfigDataResult {
  const [githubRepo, setGithubRepo] = useState('');
  const [configData, setConfigData] = useState<RemoteConfigData | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchGithubInfo = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data: RemoteConfigData = await res.json();
          if (data._githubRepo) {
            setGithubRepo(data._githubRepo);
          }
          setConfigData(data);
        } else {
          showError('GitHub 配置加载失败');
        }
      } catch {
        showError('GitHub 配置加载失败');
      } finally {
        setConfigLoaded(true);
      }
    };
    void fetchGithubInfo();
  }, []);

  return { configData, configLoaded, githubRepo };
}
