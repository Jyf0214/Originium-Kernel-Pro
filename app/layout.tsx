import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
