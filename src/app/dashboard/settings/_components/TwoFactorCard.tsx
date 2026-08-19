'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ShieldOff, Loader2, AlertCircle, Smartphone, Copy, Check, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProCard } from '@/components/ui/ProCard';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { message } from 'antd';

/**
 * 双因素认证(2FA)管理卡片
 *
 * 启用流程：setup 获取 otpauthUri + 恢复码 → 展示二维码与恢复码 → 输入验证码 verify → 启用
 * 禁用流程：输入验证码 → disable → 禁用
 * 状态随 /api/auth/me 返回的 twoFactorEnabled 联动（useAuth.refresh 刷新）
 */
export function TwoFactorCard() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();

  const enabled = user?.twoFactorEnabled === true;

  // 启用流程状态
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // 禁用流程状态
  const [disableToken, setDisableToken] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showDisableInput, setShowDisableInput] = useState(false);

  const copyRecoveryCodes = async () => {
    if (recoveryCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setRecoveryCopied(true);
      setTimeout(() => setRecoveryCopied(false), 2000);
    } catch {
      message.error(t('settings.twoFactor.copyFailed'));
    }
  };

  const startSetup = async () => {
    if (setupLoading) return;
    setSetupLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.otpauthUri) {
        setSetupUri(data.otpauthUri);
        setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
        setRecoveryCopied(false);
      } else {
        setError(data.error ?? t('settings.twoFactor.setupFailed'));
      }
    } catch {
      setError(t('settings.twoFactor.networkFailed'));
    } finally {
      setSetupLoading(false);
    }
  };

  const verifySetup = async () => {
    const token = setupToken.trim();
    if (!token) {
      message.warning(t('settings.twoFactor.enterCode'));
      return;
    }
    if (verifyLoading) return;
    setVerifyLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success(t('settings.twoFactor.enableSuccess'));
        setSetupUri(null);
        setRecoveryCodes([]);
        setSetupToken('');
        await refresh();
      } else {
        setError(data.error ?? t('settings.twoFactor.verifyFailed'));
      }
    } catch {
      setError(t('settings.twoFactor.networkFailed'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const disable2fa = async () => {
    const token = disableToken.trim();
    if (!token) {
      message.warning(t('settings.twoFactor.enterCode'));
      return;
    }
    if (disableLoading) return;
    setDisableLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success(t('settings.twoFactor.disableSuccess'));
        setDisableToken('');
        setShowDisableInput(false);
        await refresh();
      } else {
        setError(data.error ?? t('settings.twoFactor.disableFailed'));
      }
    } catch {
      setError(t('settings.twoFactor.networkFailed'));
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <ProCard className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
          {enabled
            ? <ShieldCheck size={16} className="text-green-600" />
            : <ShieldOff size={16} className="text-zinc-500" />
          }
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{t('settings.twoFactor.title')}</h3>
          <p className="text-xs text-zinc-400">{t('settings.twoFactor.desc')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!enabled ? (
        <>
          {/* 状态行 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-zinc-500">{t('settings.twoFactor.statusDisabled')}</span>
            {!setupUri && (
              <Button
                variant="primary"
                size="sm"
                autoLoading={false}
                onClick={startSetup}
                disabled={setupLoading}
                loading={setupLoading}
              >
                {setupLoading
                  ? <><Loader2 size={14} className="animate-spin" />{t('settings.twoFactor.settingUp')}</>
                  : t('settings.twoFactor.enableButton')
                }
              </Button>
            )}
          </div>

          {/* 二维码 + 验证码 */}
          {setupUri && (
            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
              <div className="flex items-center gap-2 mb-3 text-sm text-zinc-600">
                <Smartphone size={14} />
                {t('settings.twoFactor.scanHint')}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-3 rounded-lg border border-zinc-200">
                  <QRCodeSVG value={setupUri} size={160} />
                </div>
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      placeholder={t('settings.twoFactor.codePlaceholder')}
                      className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 font-mono tracking-widest"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      autoLoading={false}
                      onClick={verifySetup}
                      disabled={verifyLoading}
                      loading={verifyLoading}
                    >
                      {verifyLoading
                        ? <><Loader2 size={14} className="animate-spin" />{t('settings.twoFactor.verifying')}</>
                        : t('settings.twoFactor.verifyAndEnable')
                      }
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-400">{t('settings.twoFactor.setupHint')}</p>
                </div>
              </div>

              {/* 一次性恢复码（仅本次展示，关闭后不再出现） */}
              {recoveryCodes.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound size={14} className="text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">{t('settings.twoFactor.recoveryTitle')}</p>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">{t('settings.twoFactor.recoveryHint')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recoveryCodes.map((code) => (
                      <code key={code} className="px-2 py-1.5 bg-white border border-amber-200 rounded text-xs font-mono text-amber-900 select-all">
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={copyRecoveryCodes}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    {recoveryCopied ? <Check size={14} /> : <Copy size={14} />}
                    {recoveryCopied ? t('settings.twoFactor.copied') : t('settings.twoFactor.copyAll')}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setSetupUri(null); setRecoveryCodes([]); setSetupToken(''); setError(null); }}
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 已启用状态 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{t('settings.twoFactor.statusEnabled')}</span>
              <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {t('settings.twoFactor.enabledBadge')}
              </span>
            </div>
            {!showDisableInput && (
              <Button
                variant="danger"
                size="sm"
                autoLoading={false}
                onClick={() => setShowDisableInput(true)}
              >
                {t('settings.twoFactor.disable')}
              </Button>
            )}
          </div>

          {/* 禁用确认 */}
          {showDisableInput && (
            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg space-y-3">
              <p className="text-sm text-zinc-600">{t('settings.twoFactor.disableHint')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value)}
                  placeholder={t('settings.twoFactor.codePlaceholder')}
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 font-mono tracking-widest"
                />
                <Button
                  variant="danger"
                  size="sm"
                  autoLoading={false}
                  onClick={disable2fa}
                  disabled={disableLoading}
                  loading={disableLoading}
                >
                  {disableLoading
                    ? <><Loader2 size={14} className="animate-spin" />{t('settings.twoFactor.disabling')}</>
                    : t('settings.twoFactor.confirmDisable')
                  }
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  autoLoading={false}
                  onClick={() => { setShowDisableInput(false); setDisableToken(''); setError(null); }}
                  disabled={disableLoading}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </ProCard>
  );
}