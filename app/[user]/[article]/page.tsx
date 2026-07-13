import { Suspense } from 'react';
import { UserArticleContent } from './_components/UserArticleContent';
import { GlobalLoading } from '@/components/Loading';

export default function UserArticlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900"><GlobalLoading size="large" /></div>}>
      <UserArticleContent />
    </Suspense>
  );
}
