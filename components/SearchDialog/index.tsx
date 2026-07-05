// SearchDialog - 搜索对话框主组件
// 负责装配：动画容器、输入栏、ESC 提示、结果区域（含初始/加载/空/分组四种状态）。
// 支持键盘导航（↑↓ 选择，Enter 跳转）、搜索历史、结果计数。

'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { modalContentVariants, modalTransition } from '@/components/ui/motion';

import { SearchEmpty } from './SearchEmpty';
import { SearchHistory } from './SearchHistory';
import { SearchInput } from './SearchInput';
import { SearchResultItem, SearchResultsSummary, SearchLoading } from './SearchResults';
import { SearchTags } from './SearchTags';
import { useSearch } from './use-search';
import type { SearchDialogProps } from './types';

// 结果列表 stagger 进场动画变体
const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
} as const;

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
    selectedIndex,
    flatResults,
    handleHistoryClick,
    clearHistory,
    searchHistory,
  } = useSearch({ open, onClose });

  // 计算扁平索引偏移量（用于键盘导航定位）
  let flatOffset = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="搜索"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="relative w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
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

            {/* ── 快捷键提示 ── */}
            <div className="absolute top-4 right-14 hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-300 select-none">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono">↑↓</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono">↵</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono">ESC</kbd>
            </div>

            {/* ── 搜索结果区域 ── */}
            <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain py-2">
              {/* 初始状态：未搜索 — 显示搜索历史 + 热门标签 */}
              {!hasSearched && !query && (
                <>
                  <SearchHistory
                    history={searchHistory}
                    onHistoryClick={handleHistoryClick}
                    onClear={clearHistory}
                  />
                  <SearchTags onTagClick={handleTagClick} />
                </>
              )}

              {/* 加载中 */}
              {loading && <SearchLoading />}

              {/* 空结果 */}
              {!loading && hasSearched && results.length === 0 && (
                <SearchEmpty query={query} />
              )}

              {/* 结果计数 */}
              {!loading && hasSearched && flatResults.length > 0 && (
                <SearchResultsSummary totalResults={flatResults.length} query={query} />
              )}

              {/* 结果分组 */}
              {!loading &&
                groups.map((group) => {
                  const groupOffset = flatOffset;
                  return (
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
                      {group.results.map((result, idx) => {
                        const item = (
                          <SearchResultItem
                            key={result.id}
                            result={result}
                            query={query}
                            onClose={onClose}
                            isSelected={selectedIndex === groupOffset + idx}
                            flatIndex={groupOffset + idx}
                          />
                        );
                        return item;
                      })}
                      {/* 更新偏移量 */}
                      {(() => { flatOffset += group.results.length; return null; })()}
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
