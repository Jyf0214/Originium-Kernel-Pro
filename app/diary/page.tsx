import { DiaryPageClient } from './_components/DiaryPageClient';
import Footer from '@/components/Footer';

export default function DiaryPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <DiaryPageClient />
      <Footer />
    </div>
  );
}
