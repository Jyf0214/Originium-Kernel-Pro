import type {Metadata, Viewport} from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { RouteTransition } from '../components/RouteTransition';
import { PWARegister } from '../components/PWARegister';
import { TabTitleSwitch } from '../components/TabTitleSwitch';
import { MusicPlayerWrapper } from '../components/MusicPlayer/MusicPlayerWrapper';
import { loadConfig, hasDatabase } from '@/lib/config';
import { ThirdPartyScripts } from '@/components/ThirdPartyScripts';
import { EffectsManager } from '@/components/effects/dynamic';
import FooterWrapper from '@/components/Footer/FooterWrapper';
import { getTranslate } from '@/i18n/translate';
import { ThreeColumnLayout } from '@/components/ui/ThreeColumnLayout';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: getTranslate('app.description'),
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
        {/* 字体族：从构建时配置读取 fontFamily 并设置 CSS 变量（仅注入非空值） */}
        {(() => {
          const f = config.appearance?.fontFamily;
          if (!f) return null;
          const pairs: [string, string][] = [
            ['--font-body', f.body],
            ['--font-sans', f.sans],
            ['--font-display', f.display],
            ['--font-mono', f.mono],
            ['--font-ui', f.ui],
          ].filter(([, v]) => v) as [string, string][];
          if (pairs.length === 0) return null;
          return (
            <script
              dangerouslySetInnerHTML={{
                __html: pairs.map(([k, v]) => `document.documentElement.style.setProperty('${k}','${v}')`).join(';'),
              }}
            />
          );
        })()}
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
          {getTranslate('app.skipToContent')}
        </a>
        <Providers>
          <AuthProvider>
            <Navbar navConfig={config.nav} siteTitle={config.site.title} databaseConfigured={hasDatabase()} />
            <ThreeColumnLayout
              leftSidebar={null}
              rightSidebar={null}
            >
              <div id="main-content" className="flex flex-col min-h-screen">
                <div className="flex-1">
                  <RouteTransition>
                    <Suspense>
                      {children}
                    </Suspense>
                  </RouteTransition>
                </div>
                <FooterWrapper />
              </div>
            </ThreeColumnLayout>
          </AuthProvider>
          <MusicPlayerWrapper />
        </Providers>
        <TabTitleSwitch />
        <ThirdPartyScripts />
        <EffectsManager />
        <PWARegister />
      </body>
    </html>
  );
}
