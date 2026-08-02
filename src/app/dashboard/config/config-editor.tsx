'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import ConfigSection from '@/components/ui/ConfigSection';
import { Settings, Save, Github, CheckCircle, XCircle } from 'lucide-react';
import ConfigFormBody from './config-form-body';
import type { ConfigState } from './config-builders';
import { cn } from '@/lib/ui';

/** 侧边导航配置项 — key 用于 t() 翻译 */
const sectionKeys = [
  { id: 'section-general', key: 'general' },
  { id: 'section-auth', key: 'auth' },
  { id: 'section-access', key: 'access' },
  { id: 'section-background', key: 'background' },
  { id: 'section-custom-css', key: 'customCss' },
  { id: 'section-custom-head', key: 'customHead' },
  { id: 'section-nav', key: 'nav' },
  { id: 'section-mourn', key: 'mourn' },
  { id: 'section-highlight', key: 'highlight' },
  { id: 'section-copy', key: 'copy' },
  { id: 'section-social', key: 'social' },
  { id: 'section-author', key: 'author' },
  { id: 'section-cover', key: 'cover' },
  { id: 'section-error', key: 'error' },
  { id: 'section-postmeta', key: 'postmeta' },
  { id: 'section-wordcount', key: 'wordcount' },
  { id: 'section-toc', key: 'toc' },
  { id: 'section-copyright', key: 'copyright' },
  { id: 'section-reward', key: 'reward' },
  { id: 'section-postedit', key: 'postedit' },
  { id: 'section-share', key: 'share' },
  { id: 'section-maintone', key: 'maintone' },
  { id: 'section-footer', key: 'footer' },
  { id: 'section-loading', key: 'loading' },
  { id: 'section-music', key: 'music' },
];

function ConfigPageHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
        <Settings size={18} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('config.title')}</h1>
        <p className="text-sm text-zinc-400">{t('config.subtitle')}</p>
      </div>
    </div>
  );
}

function RemoteFetchErrorAlert({ error, t }: { error: string; t: (key: string) => string }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-800">{t('config.remoteFetchError.title')}</h2>
          <p className="text-sm text-red-600">
            {t('config.remoteFetchError.desc')}
          </p>
        </div>
      </div>
      <div className="bg-red-100/50 rounded-xl p-4 font-mono text-xs text-red-700 whitespace-pre-wrap break-all">
        {error || t('config.remoteFetchError.unknown')}
      </div>
      <p className="mt-3 text-xs text-red-500">
        {t('config.remoteFetchError.hint')}
      </p>
    </div>
  );
}

/**
 * 侧边锚点导航栏 — 仅 lg 以上屏幕显示，固定在左侧
 */
function SidebarNav({ activeId, t }: { activeId: string; t: (key: string) => string }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden lg:block fixed left-6 top-1/2 -translate-y-1/2 z-40 w-40 max-h-[70vh] overflow-y-auto scrollbar-thin">
      <div className="space-y-0.5">
        {sectionKeys.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => handleClick(sec.id)}
            className={cn(
              'block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200',
              activeId === sec.id
                ? 'text-zinc-900 font-medium bg-zinc-200/60'
                : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100',
            )}
          >
            {t(`config.section.${sec.key}`)}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function ConfigEditor({
  config,
  onConfigChange,
  t,
  githubConfigured,
  remoteConfigStatus,
  remoteConfigError,
  saving,
  DiffModal,
  onSave,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: (key: string) => string;
  githubConfigured: boolean;
  remoteConfigStatus: string;
  remoteConfigError: string;
  saving: boolean;
  DiffModal: React.ReactNode;
  onSave: () => void;
}) {
  const remoteFetchFailed = !!(remoteConfigStatus === 'error' && githubConfigured);

  /** 当前激活的分区 ID（用于侧边导航高亮） */
  const [activeSection, setActiveSection] = useState<string>(sectionKeys[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** 使用 IntersectionObserver 监听各分区进入视口 */
  const setupObserver = useCallback(() => {
    // 清理旧观察器
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
        });

        // 选择可见比例最高的分区作为激活项
        if (visibleSections.size > 0) {
          let bestId = sectionKeys[0]?.id ?? '';
          let bestRatio = 0;
          visibleSections.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });
          setActiveSection(bestId);
        }
      },
      {
        rootMargin: '-80px 0px -40% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    // 观察所有分区元素
    sectionKeys.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) {
        observerRef.current?.observe(el);
      }
    });
  }, []);

  useEffect(() => {
    // 使用 requestAnimationFrame 重试等待 DOM 渲染完成，
    // 比固定 setTimeout(100) 更可靠：表单渲染慢时也能等到元素出现
    let rafId: number;
    let retries = 0;
    const MAX_RETRIES = 60; // ~1秒@60fps
    const retrySetup = () => {
      const sectionEls = document.querySelectorAll('[id^="section-"]');
      if (sectionEls.length === 0) {
        if (retries < MAX_RETRIES) {
          retries++;
          rafId = requestAnimationFrame(retrySetup);
        }
        return;
      }
      setupObserver();
    };
    rafId = requestAnimationFrame(retrySetup);
    return () => {
      cancelAnimationFrame(rafId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 侧边锚点导航 */}
      <SidebarNav activeId={activeSection} t={t} />

      {/* 主内容区：左侧留出导航空间 */}
      <div className="p-6 lg:pl-56 max-w-4xl mx-auto space-y-4">
        {/* 顶部工具栏：标题 */}
        <ConfigPageHeader t={t} />

        {remoteFetchFailed && (
          <RemoteFetchErrorAlert error={remoteConfigError} t={t} />
        )}

        <ConfigFormBody config={config} onConfigChange={onConfigChange} t={t} />

        {/* 底部：GitHub 同步状态 + 保存按钮 */}
        <ConfigSection title={t('config.githubSync')} icon={Github} color="bg-zinc-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div
              className="px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ background: githubConfigured ? '#f6ffed' : '#fff7e6' }}
            >
              {githubConfigured ? (
                <CheckCircle size={20} style={{ color: '#52c41a' }} />
              ) : (
                <XCircle size={20} style={{ color: '#faad14' }} />
              )}
              <span className="font-medium text-sm">
                {githubConfigured ? t('config.githubSyncConfigured') : t('config.githubSyncNotConfigured')}
              </span>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={<Save size={16} />}
              onClick={onSave}
              loading={saving}
              disabled={!githubConfigured || remoteFetchFailed}
            >
              {t('config.save')}
            </Button>
          </div>
        </ConfigSection>

        {DiffModal}
      </div>
    </div>
  );
}
