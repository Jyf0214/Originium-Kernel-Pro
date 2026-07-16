// SearchHistory - 搜索历史列表：展示最近搜索记录，支持清空和点击重搜。

'use client';

import { Clock, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SECTION_TITLE_CLASS } from './types';

interface SearchHistoryProps {
  history: string[];
  onHistoryClick: (term: string) => void;
  onClear: () => void;
}

export function SearchHistory({ history, onHistoryClick, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className={SECTION_TITLE_CLASS}>
          最近搜索
        </h3>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={10} />}
          autoLoading={false}
          onClick={onClear}
        >
          清空
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((term) => (
          <Button
            key={term}
            variant="ghost"
            size="sm"
            rounded="full"
            icon={<Clock size={12} className="text-zinc-300" />}
            autoLoading={false}
            onClick={() => onHistoryClick(term)}
          >
            {term}
          </Button>
        ))}
      </div>
    </div>
  );
}
