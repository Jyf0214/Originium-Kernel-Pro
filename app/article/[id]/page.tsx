'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ArticlePage() {
  const params = useParams();
  const id = params.id as string;
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `articles/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading article...</div>;
  
  if (!article) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Article not found</h1>
        <Link href="/" className="text-emerald-600 hover:underline">Return to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-10 transition-colors">
          <ArrowLeft size={16} />
          <span>Back to articles</span>
        </Link>

        <article>
          <header className="mb-12">
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-2 mb-6">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-sm font-medium rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-zinc-900 mb-6 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-4 text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-sm font-bold text-zinc-600">
                  {article.authorName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-zinc-900">{article.authorName}</span>
              </div>
              <span>•</span>
              <time dateTime={article.createdAt}>
                {format(new Date(article.createdAt), 'MMMM d, yyyy')}
              </time>
            </div>
          </header>

          {article.coverImage && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-100 mb-12">
              <img 
                src={article.coverImage} 
                alt={article.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <MarkdownRenderer content={article.content} />
          </div>
        </article>
      </main>
    </div>
  );
}
