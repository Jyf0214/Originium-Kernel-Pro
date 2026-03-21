import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { FirebaseProvider } from '@/components/FirebaseProvider';
import { ConfigProvider } from '@/components/ConfigProvider';

export const metadata: Metadata = {
  title: 'Originium Kernel - 内容发布平台',
  description: '基于 Node/Edge Function 的现代内容发布平台，支持 GitHub 自动同步',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>
        <ConfigProvider>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
