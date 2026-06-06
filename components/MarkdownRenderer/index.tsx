'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useMarkdownConfig } from './use-markdown-config';
import { buildComponents } from './renderer-config';
import type { MarkdownRendererProps } from './types';

export function MarkdownRenderer({ content, highlight }: MarkdownRendererProps) {
  const { cfg, highlighter } = useMarkdownConfig(highlight);
  const components = buildComponents(cfg, highlighter);

  return (
    <div className="prose prose-zinc max-w-none
      prose-headings:tracking-tight prose-headings:text-zinc-900
      prose-h1:text-4xl prose-h1:font-black prose-h1:mb-8 prose-h1:mt-16
      prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-14 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-100
      prose-h3:text-xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10
      prose-p:text-zinc-600 prose-p:leading-[1.8] prose-p:text-[15px]
      prose-a:text-zinc-900 prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900
      prose-strong:text-zinc-900 prose-strong:font-bold
      prose-blockquote:border-zinc-900 prose-blockquote:bg-zinc-50 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-zinc-600
      prose-li:text-zinc-600 prose-li:text-[15px]
      prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100
      prose-hr:border-zinc-100 prose-hr:my-12
    ">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
