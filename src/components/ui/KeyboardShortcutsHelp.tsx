'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { modalContentVariants, modalTransition, DURATION } from '@/components/ui/motion';
import { X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { getTranslate } from '@/i18n/translate';

export interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  /** 仅显示这些 key（不传则显示全部） */
  visibleKeys?: string[];
}

interface ShortcutItem {
  key: string;
  label: string;
}

/** 全站快捷键定义列表 */
const ALL_SHORTCUTS: ShortcutItem[] = [
  { key: '/', label: getTranslate('components.KeyboardShortcuts.search') },
  { key: 'Shift+?', label: getTranslate('components.KeyboardShortcuts.help') },
  { key: 'Escape', label: getTranslate('components.KeyboardShortcuts.close') },
  { key: 'j', label: getTranslate('components.KeyboardShortcuts.next') },
  { key: 'k', label: getTranslate('components.KeyboardShortcuts.prev') },
];

function KbdKey({ keys }: { keys: string }) {
  const parts = keys.split('+');
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-zinc-300 text-xs">+</span>}
          <kbd className="px-1.5 py-0.5 min-w-[24px] text-center rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-sm">
            {part}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, visibleKeys }: KeyboardShortcutsHelpProps) {
  const { t } = useI18n();
  const shortcuts = visibleKeys
    ? ALL_SHORTCUTS.filter((s) => visibleKeys.includes(s.key))
    : ALL_SHORTCUTS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.FAST }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t('components.KeyboardShortcuts.title')}
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
            className="relative w-full max-w-xs mx-3 mb-3 sm:mb-0 sm:mx-4 sm:max-w-sm max-h-[50vh] sm:max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('components.KeyboardShortcuts.title')}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label={t('components.KeyboardShortcuts.close')}
              >
                <X size={14} className="text-zinc-400" />
              </button>
            </div>

            {/* 快捷键列表 */}
            <div className="px-4 py-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 not-first:border-t not-first:border-zinc-50 dark:not-first:border-zinc-800"
                >
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {shortcut.label}
                  </span>
                  <KbdKey keys={shortcut.key} />
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <p className="text-[10px] text-zinc-400 text-center">
                {t('components.KeyboardShortcuts.editorHint')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
