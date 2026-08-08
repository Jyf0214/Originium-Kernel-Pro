'use client';

import React from 'react';
import {
  Globe,
  Palette,
  Code,
  FileCode,
  Navigation,
  Heart,
  Highlighter,
  Copy,
  Share2,
  Image,
  TriangleAlert,
  FileText,
  Hash,
  List,
  Copyright,
  Gift,
  Pencil,
  Share,
  Pipette,
  PanelBottom,
  Loader2,
  Music,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import ConfigSection from '@/components/ui/ConfigSection';
import { useI18n } from '@/hooks/use-i18n';
import FormField from '@/components/ui/FormField';
import ToggleField from '@/components/ui/ToggleField';
import SiteConfigForm from '@/components/ui/SiteConfigForm';
import LoadingAnimationConfig from '@/components/ui/LoadingAnimationConfig';
import AccessControlSection from '@/components/ui/AccessControlSection';
import BackgroundConfig from '@/components/ui/BackgroundConfig';
import NavConfig from '@/components/ui/NavConfig';
import MournConfig from '@/components/ui/MournConfig';
import CodeBlockConfig from '@/components/ui/CodeBlockConfig';
import CopyConfig from '@/components/ui/CopyConfig';
import SocialConfig from '@/components/ui/SocialConfig';
import CoverConfig from '@/components/ui/CoverConfig';
import ErrorImgConfig from '@/components/ui/ErrorImgConfig';
import PostMetaConfig from '@/components/ui/PostMetaConfig';
import WordCountConfig from '@/components/ui/WordCountConfig';
import TocConfig from '@/components/ui/TocConfig';
import CopyrightConfig from '@/components/ui/CopyrightConfig';
import RewardConfig from '@/components/ui/RewardConfig';
import PostEditConfig from '@/components/ui/PostEditConfig';
import ShareConfig from '@/components/ui/ShareConfig';
import MainToneConfig from '@/components/ui/MainToneConfig';
import FooterConfig from '@/components/ui/FooterConfig';
import type { TFunc } from '@/i18n/keys';
import type { ConfigState, NavConfigData, LoadingType, LoadingPosition } from './config-builders';

function buildAccessItems(t: TFunc) {
  return [
    { key: 'posts' as const, label: t('config.accessPosts') },
    { key: 'faces' as const, label: t('config.accessFaces') },
    { key: 'diary' as const, label: t('config.accessDiary') },
  ];
}

function getPageLoadingConfig(config: ConfigState) {
  return {
    type: config.appearance.loading?.page?.type ?? 'waves',
    color: config.appearance.loading?.page?.color ?? '#71717a',
    position: config.appearance.loading?.page?.position ?? 'center',
  };
}

function getNavLoadingConfig(config: ConfigState) {
  return {
    type: config.appearance.loading?.navigation?.type ?? 'antd',
    color: config.appearance.loading?.navigation?.color ?? '#71717a',
  };
}

function LoadingAnimationsSection({
  config,
  onPageLoadingChange,
  onNavLoadingChange,
  onSlogansChange,
}: {
  config: ConfigState;
  onPageLoadingChange: (newConfig: { type: LoadingType; color: string; position?: LoadingPosition }) => void;
  onNavLoadingChange: (newConfig: { type: LoadingType; color: string }) => void;
  onSlogansChange: (slogans: string[]) => void;
}) {
  const { t } = useI18n();
  const slogansText = (config.appearance.loading?.slogans ?? []).join('\n');

  return (
    <ConfigSection id="section-loading" title={t('config.section.loading')} icon={Loader2} color="bg-purple-500">
      <div className="space-y-4">
        <LoadingAnimationConfig
          title={t('config.loading.lightTitle')}
          config={getPageLoadingConfig(config)}
          onChange={onPageLoadingChange}
          showPosition
        />
        <LoadingAnimationConfig
          title={t('config.loading.heavyTitle')}
          config={getNavLoadingConfig(config)}
          onChange={onNavLoadingChange}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-100">
        <FormField
          label={t('config.loading.slogansLabel')}
          value={slogansText}
          onChange={v => onSlogansChange(v.split('\n').filter(s => s.trim().length > 0))}
          type="textarea"
          rows={8}
          placeholder={t('config.loading.slogansPlaceholder')}
        />
      </div>
    </ConfigSection>
  );
}

interface SimpleHandlerSection {
  id: string;
  title: string;
  color: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

function renderSimpleSection(s: SimpleHandlerSection, idx: number) {
  return (
    <ConfigSection key={idx} id={s.id} title={s.title} icon={s.icon} color={s.color}>
      {s.children}
    </ConfigSection>
  );
}

export default function ConfigFormBody({
  config,
  onConfigChange,
  t,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: TFunc;
}) {
  const handlePageLoadingChange = (newConfig: { type: LoadingType; color: string; position?: LoadingPosition }) => {
    onConfigChange({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: newConfig.type,
            color: newConfig.color,
            position: (newConfig.position ?? 'center'),
          },
        },
      },
    });
  };

  const handleNavLoadingChange = (newConfig: { type: LoadingType; color: string }) => {
    onConfigChange({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          navigation: {
            type: newConfig.type,
            color: newConfig.color,
          },
        },
      },
    });
  };

  const handleSlogansChange = (slogans: string[]) => {
    onConfigChange({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          slogans,
        },
      },
    });
  };

  const handleAccessToggle = (accessType: 'posts' | 'faces' | 'diary', checked: boolean) => {
    const value = checked ? { public: ['*'], private: [] } : { public: [], private: ['*'] };
    onConfigChange({
      ...config,
      access: {
        ...config.access,
        [accessType]: value,
      },
    });
  };

  const isAccessPublic = (accessType: 'posts' | 'faces' | 'diary') => {
    return config.access[accessType].public.includes('*');
  };

  const accessItems = buildAccessItems(t);

  const handleSiteChange = (newSite: ConfigState['site']) => onConfigChange({ ...config, site: newSite });

  const handleBgChange = (newBg: ConfigState['appearance']['background']) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, background: newBg },
  });

  const handleFontSizeChange = (v: string) => {
    const num = parseInt(v, 10);
    if (!isNaN(num) && num >= 10 && num <= 30) {
      onConfigChange({
        ...config,
        appearance: { ...config.appearance, fontSize: num },
      });
    }
  };

  const handleCssChange = (v: string) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, customCSS: v },
  });

  const handleHeadChange = (v: string) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, customHead: v },
  });

  const handleNavChange = (v: NavConfigData) => onConfigChange({ ...config, nav: v });
  const handleMournChange = (v: ConfigState['mourn']) => onConfigChange({ ...config, mourn: v });
  const handleHighlightChange = (v: ConfigState['highlight']) => onConfigChange({ ...config, highlight: v });
  const handleCopyChange = (v: ConfigState['copy']) => onConfigChange({ ...config, copy: v });
  const handleSocialChange = (v: ConfigState['social']) => onConfigChange({ ...config, social: v });
  const handleCoverChange = (v: ConfigState['cover']) => onConfigChange({ ...config, cover: v });
  const handleErrorImgChange = (v: ConfigState['errorImg']) => onConfigChange({ ...config, errorImg: v });
  const handlePostMetaChange = (v: ConfigState['postMeta']) => onConfigChange({ ...config, postMeta: v });
  const handleWordcountChange = (v: ConfigState['wordcount']) => onConfigChange({ ...config, wordcount: v });
  const handleTocChange = (v: ConfigState['toc']) => onConfigChange({ ...config, toc: v });
  const handleCopyrightChange = (v: ConfigState['copyright']) => onConfigChange({ ...config, copyright: v });
  const handleRewardChange = (v: ConfigState['reward']) => onConfigChange({ ...config, reward: v });
  const handlePostEditChange = (v: ConfigState['postEdit']) => onConfigChange({ ...config, postEdit: v });
  const handleShareChange = (v: ConfigState['share']) => onConfigChange({ ...config, share: v });
  const handleMainToneChange = (v: ConfigState['mainTone']) => onConfigChange({ ...config, mainTone: v });
  const handleFooterChange = (v: ConfigState['footer']) => onConfigChange({ ...config, footer: v });

  const simpleSections: SimpleHandlerSection[] = [
    { id: 'section-custom-css', title: t('config.customCSS'), icon: Code, color: 'bg-orange-500', children: <FormField label="" value={config.appearance.customCSS} onChange={handleCssChange} type="textarea" rows={6} placeholder={t('config.customCSSPlaceholder')} /> },
    { id: 'section-custom-head', title: t('config.customHead'), icon: FileCode, color: 'bg-cyan-500', children: <FormField label="" value={config.appearance.customHead} onChange={handleHeadChange} type="textarea" rows={4} placeholder={t('config.customHeadPlaceholder')} /> },
    { id: 'section-nav', title: t('config.nav'), icon: Navigation, color: 'bg-indigo-500', children: <NavConfig config={config.nav} onChange={handleNavChange} /> },
    { id: 'section-mourn', title: t('config.mourn'), icon: Heart, color: 'bg-zinc-500', children: <MournConfig config={config.mourn} onChange={handleMournChange} /> },
    { id: 'section-highlight', title: t('config.highlight'), icon: Highlighter, color: 'bg-emerald-600', children: <CodeBlockConfig config={config.highlight} onChange={handleHighlightChange} /> },
    { id: 'section-copy', title: t('config.copy'), icon: Copy, color: 'bg-cyan-600', children: <CopyConfig config={config.copy} onChange={handleCopyChange} /> },
    { id: 'section-social', title: t('config.social'), icon: Share2, color: 'bg-pink-500', children: <SocialConfig config={config.social} onChange={handleSocialChange} /> },
    { id: 'section-cover', title: t('config.cover'), icon: Image, color: 'bg-teal-500', children: <CoverConfig config={config.cover} onChange={handleCoverChange} /> },
    { id: 'section-error', title: t('config.errorImg'), icon: TriangleAlert, color: 'bg-red-500', children: <ErrorImgConfig config={config.errorImg} onChange={handleErrorImgChange} /> },
    { id: 'section-postmeta', title: t('config.postMeta'), icon: FileText, color: 'bg-violet-500', children: <PostMetaConfig config={config.postMeta} onChange={handlePostMetaChange} /> },
    { id: 'section-wordcount', title: t('config.wordcount'), icon: Hash, color: 'bg-orange-600', children: <WordCountConfig config={config.wordcount} onChange={handleWordcountChange} /> },
    { id: 'section-toc', title: t('config.toc'), icon: List, color: 'bg-lime-600', children: <TocConfig config={config.toc} onChange={handleTocChange} /> },
    { id: 'section-copyright', title: t('config.copyright'), icon: Copyright, color: 'bg-blue-600', children: <CopyrightConfig config={config.copyright} onChange={handleCopyrightChange} /> },
    { id: 'section-reward', title: t('config.reward'), icon: Gift, color: 'bg-yellow-600', children: <RewardConfig config={config.reward} onChange={handleRewardChange} /> },
    { id: 'section-postedit', title: t('config.postEdit'), icon: Pencil, color: 'bg-sky-600', children: <PostEditConfig config={config.postEdit} onChange={handlePostEditChange} /> },
    { id: 'section-share', title: t('config.share'), icon: Share, color: 'bg-green-500', children: <ShareConfig config={config.share} onChange={handleShareChange} /> },
    { id: 'section-maintone', title: t('config.mainTone'), icon: Pipette, color: 'bg-purple-500', children: <MainToneConfig config={config.mainTone} onChange={handleMainToneChange} /> },
    { id: 'section-footer', title: t('config.footer'), icon: PanelBottom, color: 'bg-zinc-600', children: <FooterConfig config={config.footer} onChange={handleFooterChange} /> },
  ];

  return (
    <>
      <ConfigSection id="section-general" title={t('config.general')} icon={Globe} color="bg-emerald-500">
        <SiteConfigForm config={config.site} onChange={handleSiteChange} />
      </ConfigSection>

      <AccessControlSection
        id="section-access"
        title={t('config.accessControl')}
        items={accessItems}
        isPublic={isAccessPublic}
        onToggle={handleAccessToggle}
        publicLabel={t('config.accessPublic')}
        privateLabel={t('config.accessPrivate')}
      />

      <ConfigSection id="section-background" title={t('config.background')} icon={Palette} color="bg-blue-500">
        <BackgroundConfig
          config={config.appearance.background}
          onChange={handleBgChange}
          urlLabel={t('config.backgroundUrl')}
          opacityLabel={t('config.overlayOpacity')}
        />
        <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4">
          <FormField
            label={t('config.favicon.label')}
            value={config.appearance.favicon ?? ''}
            onChange={v => onConfigChange({
              ...config,
              appearance: { ...config.appearance, favicon: v },
            })}
            placeholder="/img/my-icon.png"
          />
          <p className="text-xs text-zinc-400 -mt-2">{t('config.favicon.hint')}</p>
          <FormField
            label={t('config.fontSize.label')}
            value={String(config.appearance.fontSize ?? 15)}
            onChange={handleFontSizeChange}
            type="text"
            placeholder="15"
          />
          <p className="text-xs text-zinc-400 -mt-2">{t('config.fontSize.hint')}</p>
        </div>
      </ConfigSection>

      <ConfigSection id="section-effects" title={t('config.effects.title')} icon={Sparkles} color="bg-rose-500">
        <div className="space-y-3">
          <ToggleField
            label={t('config.effects.mouseClick')}
            description={t('config.effects.mouseClickDesc')}
            checked={config.appearance.effects.mouseClick}
            onChange={v => onConfigChange({
              ...config,
              appearance: { ...config.appearance, effects: { ...config.appearance.effects, mouseClick: v } },
            })}
          />
          <ToggleField
            label={t('config.effects.backgroundParticles')}
            description={t('config.effects.backgroundParticlesDesc')}
            checked={config.appearance.effects.backgroundParticles}
            onChange={v => onConfigChange({
              ...config,
              appearance: { ...config.appearance, effects: { ...config.appearance.effects, backgroundParticles: v } },
            })}
          />
          <ToggleField
            label={t('config.effects.confetti')}
            description={t('config.effects.confettiDesc')}
            checked={config.appearance.effects.confetti}
            onChange={v => onConfigChange({
              ...config,
              appearance: { ...config.appearance, effects: { ...config.appearance.effects, confetti: v } },
            })}
          />
        </div>
      </ConfigSection>

      {simpleSections.map(renderSimpleSection)}

      <LoadingAnimationsSection
        config={config}
        onPageLoadingChange={handlePageLoadingChange}
        onNavLoadingChange={handleNavLoadingChange}
        onSlogansChange={handleSlogansChange}
      />

      <ConfigSection id="section-music" title={t('config.section.music')} icon={Music} color="bg-fuchsia-500">
        <ToggleField
          label={t('config.music.enable')}
          checked={config.music.enable}
          onChange={v => onConfigChange({ ...config, music: { ...config.music, enable: v } })}
        />
        {config.music.enable && (
          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4">
            <ToggleField
              label={t('config.music.autoPlay')}
              checked={config.music.autoPlay}
              onChange={v => onConfigChange({ ...config, music: { ...config.music, autoPlay: v } })}
            />
            <FormField
              label={t('config.music.songsLabel')}
              value={JSON.stringify(config.music.songs, null, 2)}
              onChange={v => {
                try {
                  const parsed = JSON.parse(v) as ConfigState['music']['songs'];
                  onConfigChange({ ...config, music: { ...config.music, songs: parsed } });
                } catch {
                  // JSON 不合法时忽略，等用户修正
                }
              }}
              type="textarea"
              rows={6}
              placeholder={t('config.music.songsPlaceholder')}
            />
          </div>
        )}
      </ConfigSection>
    </>
  );
}
