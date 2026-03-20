'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    content: string;
    authorName: string;
    createdAt: string;
    tags?: string[];
    coverImage?: string;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const excerpt = article.content.substring(0, 150) + (article.content.length > 150 ? '...' : '');
  const date = new Date(article.createdAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-zinc-300 hover:shadow-lg transition-all duration-300"
    >
      {article.coverImage && (
        <div className="h-48 w-full overflow-hidden bg-zinc-100">
          <img 
            src={article.coverImage} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          {article.tags && article.tags.length > 0 && (
            <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full">
              {article.tags[0]}
            </span>
          )}
          <span className="text-xs text-zinc-500">{timeAgo}</span>
        </div>
        
        <h3 className="text-xl font-bold text-zinc-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {article.title}
        </h3>
        
        <p className="text-zinc-600 text-sm mb-6 line-clamp-3 flex-1">
          {excerpt}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">
              {article.authorName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-zinc-700">{article.authorName}</span>
          </div>
          
          <Link 
            href={`/article/${article.id}`}
            className="flex items-center gap-1 text-sm font-medium text-zinc-900 group-hover:text-emerald-600 transition-colors"
          >
            Read more <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
