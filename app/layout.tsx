import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { loadConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const config = loadConfig();
  return (
    <html lang={config.site.lang} suppressHydrationWarning>
      <body>
        <CustomHead />
        <Providers>
          <AuthProvider>
            <Navbar navConfig={config.nav} siteTitle={config.site.title} />
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
