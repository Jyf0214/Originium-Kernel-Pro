'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Icon } from '@lobehub/ui';
import { useI18n } from '@/hooks/use-i18n';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useI18n();

  const locales = [
    { code: 'zh-CN' as const, name: '简体中文', flag: '🇨🇳' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
  ];

  const handleSwitch = (code: 'zh-CN' | 'en') => {
    setLocale(code);
    setIsOpen(false);
  };

  const currentLang = locales.find(l => l.code === locale) || locales[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        <Icon icon={Globe} style={{ fontSize: 14 }} />
        <span>{currentLang.flag}</span>
        <span>{currentLang.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 4,
            background: '#ffffff',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            zIndex: 1000,
            minWidth: 150,
          }}>
            {locales.map(l => (
              <button
                key={l.code}
                onClick={() => handleSwitch(l.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 16px',
                  background: locale === l.code ? '#f5f5f5' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = locale === l.code ? '#f5f5f5' : 'transparent';
                }}
              >
                <span>{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
