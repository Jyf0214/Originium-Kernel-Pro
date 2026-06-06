// SearchEmpty - 搜索无结果空状态

'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchEmptyProps {
  query: string;
}

export function SearchEmpty({ query }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
        <Search size={24} className="text-zinc-300" />
      </div>
      <p className="text-zinc-500 font-medium">
        未找到与「{query}」相关的内容
      </p>
      <p className="text-zinc-400 text-sm mt-1">请尝试其他关键词或标签</p>
    </div>
  );
}
