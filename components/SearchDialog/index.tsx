// SearchDialog - 搜索对话框主组件
// 负责装配：动画容器、输入栏、ESC 提示、结果区域（含初始/加载/空/分组四种状态）。
// 状态与副作用由 use-search hook 提供；视觉单元由同级子组件负责。

'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { SearchEmpty } from './SearchEmpty';
import { SearchInput } from './SearchInput';
import { SearchResultItem, SearchLoading } from './SearchResults';
import { SearchTags } from './SearchTags';
import { useSearch } from './use-search';
import type { SearchDialogProps } from './types';

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const {
    query,
    setQuery,
    results,
    groups,
    loading,
    hasSearched,
    inputRef,
    handleTagClick,
  } = useSearch({ open, onClose });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 搜索输入栏 ── */}
            <SearchInput
              value={query}
              onChange={setQuery}
              loading={loading}
              onClose={onClose}
              inputRef={inputRef}
            />

            {/* ── ESC 快捷键提示 ── */}
            <div className="absolute top-4 right-14 hidden sm:flex items-center gap-1 text-[11px] text-zinc-300 select-none">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono">
                ESC
              </kbd>
            </div>

            {/* ── 搜索结果区域 ── */}
            <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain py-2">
              {/* 初始状态：未搜索 */}
              {!hasSearched && !query && (
                <SearchTags onTagClick={handleTagClick} />
              )}

              {/* 加载中 */}
              {loading && <SearchLoading />}

              {/* 空结果 */}
              {!loading && hasSearched && results.length === 0 && (
                <SearchEmpty query={query} />
              )}

              {/* 结果分组 */}
              {!loading &&
                groups.map((group) => (
                  <div key={group.type}>
                    {/* 分组标题 */}
                    <div className="px-6 py-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                        {group.label}
                        <span className="ml-1.5 font-normal normal-case text-zinc-300">
                          ({group.results.length})
                        </span>
                      </h3>
                    </div>

                    {/* 分组结果列表 */}
                    {group.results.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        query={query}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
