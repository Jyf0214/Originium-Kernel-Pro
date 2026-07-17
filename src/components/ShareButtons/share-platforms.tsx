import React from 'react';
import type { PlatformDef, ShareConfig } from './types';
import {
  TwitterIcon,
  FacebookIcon,
  WeiboIcon,
  WeChatIcon,
  QQIcon,
  TelegramIcon,
  WhatsAppIcon,
  RedditIcon,
  LinkedInIcon,
  EmailIcon,
} from '@/components/ui/SocialIcons';

/* ============================================================
   平台映射
   ============================================================ */

/** 构建全部平台映射 */
function buildPlatforms(): Record<string, PlatformDef> {
  return {
    twitter: {
      id: 'twitter',
      name: 'Twitter',
      color: '#000000',
      hoverColor: '#333333',
      icon: <TwitterIcon size={20} />,
      shareUrl: (url, title) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    facebook: {
      id: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      hoverColor: '#1664D9',
      icon: <FacebookIcon size={20} />,
      shareUrl: (url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    weibo: {
      id: 'weibo',
      name: '微博',
      color: '#E6162D',
      hoverColor: '#C81023',
      icon: <WeiboIcon size={20} />,
      shareUrl: (url, title) =>
        `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    wechat: {
      id: 'wechat',
      name: '微信',
      color: '#07C160',
      hoverColor: '#06AD56',
      icon: <WeChatIcon size={20} />,
      shareUrl: () => null, // 复制链接提示
    },
    qq: {
      id: 'qq',
      name: 'QQ',
      color: '#12B7F5',
      hoverColor: '#0EA5E9',
      icon: <QQIcon size={20} />,
      shareUrl: (url, title) =>
        `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    telegram: {
      id: 'telegram',
      name: 'Telegram',
      color: '#0088CC',
      hoverColor: '#0077B3',
      icon: <TelegramIcon size={20} />,
      shareUrl: (url, title) =>
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    whatsapp: {
      id: 'whatsapp',
      name: 'WhatsApp',
      color: '#25D366',
      hoverColor: '#128C7E',
      icon: <WhatsAppIcon size={20} />,
      shareUrl: (url, title) =>
        `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
    },
    reddit: {
      id: 'reddit',
      name: 'Reddit',
      color: '#FF4500',
      hoverColor: '#CC3700',
      icon: <RedditIcon size={20} />,
      shareUrl: (url, title) =>
        `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    linkedin: {
      id: 'linkedin',
      name: 'LinkedIn',
      color: '#0A66C2',
      hoverColor: '#004182',
      icon: <LinkedInIcon size={20} />,
      shareUrl: (url) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    email: {
      id: 'email',
      name: 'Email',
      color: '#EA4335',
      hoverColor: '#D33426',
      icon: <EmailIcon size={20} />,
      shareUrl: (url, title) =>
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    },
  };
}

/** 模块级缓存，避免每次渲染重新构建 JSX 元素 */
let _platformsCache: Record<string, PlatformDef> | null = null;
function getPlatforms(): Record<string, PlatformDef> {
  _platformsCache ??= buildPlatforms();
  return _platformsCache;
}

/* ============================================================
   从 config 解析启用的平台列表
   ============================================================ */

function parsePlatformsFromConfig(config?: ShareConfig): string[] {
  if (!config) return ['twitter', 'facebook', 'weibo', 'wechat', 'qq', 'telegram', 'whatsapp', 'reddit', 'linkedin', 'email'];

  if (config.sharejs?.enable && config.sharejs.sites) {
    return config.sharejs.sites.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (config.addtoany?.enable && config.addtoany.item) {
    // 将 addtoany 的平台名映射到我们的平台名
    const mapping: Record<string, string> = {
      twitter: 'twitter',
      facebook: 'facebook',
      sina_weibo: 'weibo',
      wechat: 'wechat',
      qq: 'qq',
      telegram: 'telegram',
      whatsapp: 'whatsapp',
      reddit: 'reddit',
      linkedin: 'linkedin',
      email: 'email',
      copy_link: 'copy',
    };
    return config.addtoany.item.split(',').map(s => mapping[s.trim()] ?? s.trim()).filter(Boolean);
  }

  return ['twitter', 'facebook', 'weibo', 'wechat', 'qq', 'telegram', 'whatsapp', 'reddit', 'linkedin', 'email'];
}

/* ============================================================
   配置加载 hook
   ============================================================ */

function useShareConfig(config?: ShareConfig) {
  const platformKeys = parsePlatformsFromConfig(config);
  const allPlatforms = getPlatforms();
  const platforms = platformKeys
    .filter(k => allPlatforms[k])
    .map(k => allPlatforms[k]!);

  return { platforms, hasShareJS: config?.sharejs?.enable, hasAddToAny: config?.addtoany?.enable };
}

export {
  buildPlatforms,
  getPlatforms,
  parsePlatformsFromConfig,
  useShareConfig,
};
