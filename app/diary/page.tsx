import { DiaryPageClient } from './_components/DiaryPageClient';
import FooterWrapper from '@/components/Footer/FooterWrapper';

export default function DiaryPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <DiaryPageClient />
      <FooterWrapper />
    </div>
  );
}
