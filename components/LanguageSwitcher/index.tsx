'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useI18n();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = [
    { code: 'zh-CN' as const, name: '中文' },
    { code: 'en' as const, name: 'EN' },
  ];

  const handleSwitch = (code: 'zh-CN' | 'en') => {
    setLocale(code);
    setIsOpen(false);
  };

  // 点击外部关闭下拉菜单
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
      dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  const currentLang = locales.find(l => l.code === locale) ?? locales[0]!;

  return (
    <div ref={wrapperRef} className="relative">
      <Button variant="default" size="sm" onClick={() => setIsOpen(!isOpen)} className="justify-start bg-transparent" autoLoading={false}>
        <Globe size={14} className="text-zinc-500 dark:text-zinc-400" />
        <span className="text-xs font-medium">{currentLang.name}</span>
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-[1000] min-w-[150px] fixed"
            style={{
              top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().bottom + 4 : 68,
              left: wrapperRef.current
                ? Math.min(wrapperRef.current.getBoundingClientRect().left, window.innerWidth - 170)
                : 0,
            }}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {locales.map(l => (
              <Button
                key={l.code}
                onClick={() => handleSwitch(l.code)}
                variant="ghost"
                size="sm"
                block
                className={`justify-start ${locale === l.code ? 'bg-zinc-100' : ''}`}
                autoLoading={false}
              >
                <span>{l.name}</span>
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
