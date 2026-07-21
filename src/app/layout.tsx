import type {Metadata, Viewport} from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { RouteTransition } from '../components/RouteTransition';
import { PWARegister } from '../components/PWARegister';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { PWAUpdateNotification } from '../components/PWAUpdateNotification';
import { TabTitleSwitch } from '../components/TabTitleSwitch';
import { MusicPlayerWrapper } from '../components/MusicPlayer/MusicPlayerWrapper';
import { loadConfig, hasDatabase } from '@/lib/config';
import { ThirdPartyScripts } from '@/components/ThirdPartyScripts';
import { EffectsManager } from '@/components/effects/dynamic';
import FooterWrapper from '@/components/Footer/FooterWrapper';
import { MobileTabBar } from '@/components/MobileTabBar';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Originium',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const config = await loadConfig();
  return (
    <html lang={config.site.lang} suppressHydrationWarning>
      <head>
        {/* 预连接外部资源，提前建立 TLS 连接减少延迟 */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://giscus.app" />
        <link rel="preconnect" href="https://giscus.app" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* RSS/Atom/JSON Feed 自动发现：浏览器和阅读器可自动识别订阅源 */}
        <link rel="alternate" type="application/rss+xml" title={`${config.site.title} - RSS`} href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title={`${config.site.title} - Atom`} href="/feed.atom" />
        <link rel="alternate" type="application/feed+json" title={`${config.site.title} - JSON Feed`} href="/feed.json" />
        {/* 暗色模式 FOUC 防护：在 React hydration 前读取 localStorage 并应用 dark 类 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('theme-mode');if(m==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        {/* 字体大小：从构建时配置读取 fontSize 并设置 CSS 变量 */}
        {typeof config.appearance?.fontSize === 'number' && config.appearance.fontSize >= 10 && config.appearance.fontSize <= 30 && (
          <script
            dangerouslySetInnerHTML={{
              __html: `document.documentElement.style.setProperty('--base-font-size','${config.appearance.fontSize}px')`,
            }}
          />
        )}
        {/* 构建时注入固定头像路径 /avatar.jpg（由 prebuild 脚本下载），运行时不依赖外部 URL */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__AVATAR_URL__="/avatar.jpg"`,
          }}
        />
      </head>
      <body>
        <CustomHead />
        {/* 跳过导航链接：键盘用户可直接跳到正文 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-zinc-900 focus:outline-none"
        >
          跳到正文内容
        </a>
        <Providers>
          <AuthProvider>
            <Navbar navConfig={config.nav} siteTitle={config.site.title} databaseConfigured={hasDatabase()} />
            <div id="main-content" className="flex-1" tabIndex={-1}>
              <RouteTransition>
                    <Suspense>
                      {children}
                    </Suspense>
              </RouteTransition>
            </div>
            <FooterWrapper />
          </AuthProvider>
          <MusicPlayerWrapper />
        </Providers>
        <TabTitleSwitch />
        <ThirdPartyScripts />
        <EffectsManager />
        <PWARegister />
        {/* PWA 安装提示和更新通知 */}
        <PWAInstallPrompt />
        <PWAUpdateNotification />
        {/* 移动端底部 Tab 导航栏：仅在 < 768px 屏幕显示 */}
        <MobileTabBar />
      </body>
    </html>
  );
}
