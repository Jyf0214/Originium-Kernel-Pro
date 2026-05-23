import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>
        <CustomHead />
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
