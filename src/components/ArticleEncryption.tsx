'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Eye } from 'lucide-react';
import { ProCard } from '@/components/ui/ProCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/ui';
import { EASE_STANDARD } from '@/components/ui/motion';

/**
 * 将输入文本通过 Web Crypto API 进行 SHA-256 哈希
 * 返回小写十六进制字符串
 */
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

interface ArticleEncryptionProps {
  /** 存储在 frontmatter 中的密码哈希值 */
  passwordHash: string;
  /** 验证成功后调用，传入解密后的内容 */
  onDecrypted: (content: string) => void;
  /** 原始文章内容（加密前） */
  encryptedContent: string;
  className?: string;
}

/**
 * 文章加密密码验证组件
 * - 居中卡片布局，锁图标 + 密码输入框
 * - 使用 Web Crypto SHA-256 验证密码
 * - AnimatePresence 过渡动画
 * 注意：密码验证完全在客户端进行，适用于静态站点场景
 * 密码哈希存储在文章 frontmatter 中，验证通过后显示解密内容
 */
export function ArticleEncryption({
  passwordHash,
  onDecrypted,
  encryptedContent,
  className,
}: ArticleEncryptionProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [stage, setStage] = useState<'input' | 'success'>('input');

  const handleVerify = useCallback(async () => {
    if (!inputValue.trim()) return;

    setVerifying(true);
    setError(false);

    try {
      const hash = await sha256Hex(inputValue.trim());
      if (hash === passwordHash) {
        setStage('success');
        // 动画完成后回调
        setTimeout(() => {
          onDecrypted(encryptedContent);
        }, 600);
      } else {
        setError(true);
      }
    } catch {
      // Web Crypto API 不可用时的降级处理
      setError(true);
    } finally {
      setVerifying(false);
    }
  }, [inputValue, passwordHash, onDecrypted, encryptedContent]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleVerify();
      }
    },
    [handleVerify],
  );

  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <AnimatePresence mode="wait">
        {stage === 'input' ? (
          <motion.div
            key="encryption-gate"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: EASE_STANDARD }}
          >
            <ProCard className="w-full max-w-md shadow-lg">
              <div className="flex flex-col items-center gap-6 py-4">
                {/* 锁图标 */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center"
                >
                  <Lock size={28} className="text-zinc-500 dark:text-zinc-400" />
                </motion.div>

                {/* 标题 */}
                <div className="text-center">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    本文已加密
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    请输入密码以查看内容
                  </p>
                </div>

                {/* 密码输入框 */}
                <div className="w-full">
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError(false);
                    }}
                    onKeyDown={handleKeyDown}
                    size="lg"
                    rounded="lg"
                    ring="strong"
                    error={error ? '密码错误' : undefined}
                    autoFocus
                  />
                </div>

                {/* 错误提示 */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Tag variant="danger" size="sm">
                        密码错误
                      </Tag>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 确认按钮 */}
                <Button
                  variant="primary"
                  size="lg"
                  block
                  loading={verifying}
                  disabled={!inputValue.trim()}
                  onClick={handleVerify}
                  icon={verifying ? undefined : <Unlock size={16} />}
                >
                  {verifying ? '验证中...' : '确认'}
                </Button>
              </div>
            </ProCard>
          </motion.div>
        ) : (
          <motion.div
            key="decryption-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_STANDARD }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
            >
              <Eye size={22} className="text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              验证成功，正在加载内容...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ArticleEncryption.displayName = 'ArticleEncryption';
export default ArticleEncryption;
