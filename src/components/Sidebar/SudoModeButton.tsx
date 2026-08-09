'use client';

import { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { ShieldCheck, ShieldAlert, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';

interface SudoModeButtonProps {
  /** 桌面端侧栏折叠态：仅显示图标 */
  collapsed?: boolean;
}

/**
 * sudo 模式入口（仅 admin 角色可见）
 *
 * - 未激活：显示"进入 sudo 模式"按钮，点击弹出密码验证框
 * - 激活中：显示激活状态与剩余时间，可退出
 * - root 角色本身拥有全部权限，无需此入口
 */
function SudoModeButton({ collapsed }: SudoModeButtonProps) {
  const { user, sudoModeActive, sudoModeExpiresAt, enterSudoMode, exitSudoMode } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remainingText, setRemainingText] = useState('');

  // 剩余时间倒计时（每 30 秒刷新一次显示）
  useEffect(() => {
    if (!sudoModeActive || sudoModeExpiresAt === null) {
      setRemainingText('');
      return;
    }
    const update = () => {
      const ms = sudoModeExpiresAt - Date.now();
      if (ms <= 0) {
        setRemainingText('');
        return;
      }
      setRemainingText(t('auth.sudoModeExpiresIn', { minutes: String(Math.ceil(ms / 60000)) }));
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [sudoModeActive, sudoModeExpiresAt, t]);

  // 仅 admin 显示入口（root 无需提权）
  if (user?.role !== 'admin') return null;

  const handleEnter = async () => {
    if (!password) {
      return;
    }
    setSubmitting(true);
    try {
      await enterSudoMode(password);
      setOpen(false);
      setPassword('');
    } catch {
      // 错误提示已由 enterSudoMode 内部弹出
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async () => {
    await exitSudoMode();
  };

  if (sudoModeActive) {
    return (
      <div
        className={`flex items-center gap-3 py-2.5 rounded-xl w-full no-underline font-medium transition-all duration-300 ${
          collapsed ? 'justify-center px-0' : 'px-3'
        }`}
        title={remainingText || t('auth.sudoModeActive')}
      >
        <ShieldCheck size={18} className="shrink-0 text-emerald-500" />
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {t('auth.sudoModeActive')}
              </span>
              {remainingText && (
                <span className="block text-[10px] text-zinc-400 truncate">{remainingText}</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleExit}
              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              aria-label={t('auth.sudoModeExit')}
              title={t('auth.sudoModeExit')}
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 w-full no-underline font-medium ${
          collapsed ? 'justify-center px-0' : 'px-3'
        }`}
        title={t('auth.sudoModeEntry')}
      >
        <ShieldAlert size={18} className="shrink-0 text-zinc-300" />
        {!collapsed && <span>{t('auth.sudoModeEntry')}</span>}
      </button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={380}
        centered
        destroyOnClose
      >
        <div className="py-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
              <KeyRound size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 m-0">
                {t('auth.sudoModeTitle')}
              </h3>
              <p className="text-xs text-zinc-400 m-0 mt-0.5">{t('auth.sudoModeDesc')}</p>
            </div>
          </div>

          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleEnter}
            placeholder={t('auth.sudoModePasswordPlaceholder')}
            disabled={submitting}
            autoFocus
            size="large"
          />

          <button
            type="button"
            onClick={handleEnter}
            disabled={submitting || !password}
            className={`mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300 no-underline ${
              submitting || !password
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
            }`}
          >
            {submitting ? t('auth.sudoModeSubmitting') : t('auth.sudoModeSubmit')}
          </button>
        </div>
      </Modal>
    </>
  );
}

export default SudoModeButton;