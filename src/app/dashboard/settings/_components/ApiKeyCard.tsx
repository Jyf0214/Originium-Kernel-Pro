'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Key, Plus, Trash2, AlertCircle, Loader2, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProCard } from '@/components/ui/ProCard';
import { PermissionsEditor } from './PermissionsEditor';
import { PERMISSION_GROUPS, type ApiKeyPermissions } from '@/lib/api-key-permissions';
import { useI18n } from '@/hooks/use-i18n';

interface ApiKeyItem {
  id: string;
  name: string;
  permissions: ApiKeyPermissions | null;
  lastUsed: string | null;
  createdAt: string;
}

/** 检查权限是否为"全部权限" */
function isFullPermissions(p: ApiKeyPermissions | null | undefined): boolean {
  if (!p) return true;
  return Object.values(p.actions).every(Boolean);
}

/** 创建全部权限对象 */
function createFullPermissions(): ApiKeyPermissions {
  return {
    actions: Object.fromEntries(
      PERMISSION_GROUPS.flatMap(g => g.actions.map(a => [a.key, true]))
    ) as ApiKeyPermissions['actions'],
  };
}

export function ApiKeyCard() {
  const { t } = useI18n();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 权限编辑状态
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<ApiKeyPermissions | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // 创建时的权限设置
  const [showCreatePermissions, setShowCreatePermissions] = useState(false);
  const [newKeyPermissions, setNewKeyPermissions] = useState<ApiKeyPermissions>(createFullPermissions());

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/api-keys');
      if (res.ok) {
        const data = (await res.json()) as { keys: ApiKeyItem[] };
        setKeys(data.keys ?? []);
        setError(null);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t('settings.apiKey.requestFailed', { status: res.status }));
      }
    } catch {
      setError(t('settings.apiKey.networkFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName || undefined,
          permissions: isFullPermissions(newKeyPermissions) ? undefined : newKeyPermissions,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ApiKeyItem & { key: string };
        setShowNewKey(data.key);
        setNewKeyName('');
        setNewKeyPermissions(createFullPermissions());
        setShowCreatePermissions(false);
        await loadKeys();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t('settings.apiKey.generateFailed', { status: res.status }));
      }
    } catch {
      setError(t('settings.apiKey.networkFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('settings.apiKey.copyFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setConfirmDeleteId(null);
    setError(null);
    try {
      const res = await fetch(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        if (expandedId === id) {
          setExpandedId(null);
          setEditingPermissions(null);
        }
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t('settings.apiKey.deleteFailed', { status: res.status }));
      }
    } catch {
      setError(t('settings.apiKey.networkFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingPermissions(null);
    } else {
      const key = keys.find(k => k.id === id);
      setExpandedId(id);
      setEditingPermissions(key?.permissions ? JSON.parse(JSON.stringify(key.permissions)) : createFullPermissions());
    }
  };

  const handleSavePermissions = async () => {
    if (!expandedId || !editingPermissions) return;
    setSavingPermissions(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/api-keys/${expandedId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: isFullPermissions(editingPermissions) ? null : editingPermissions }),
      });
      if (res.ok) {
        setKeys(prev => prev.map(k =>
          k.id === expandedId
            ? { ...k, permissions: isFullPermissions(editingPermissions) ? null : editingPermissions }
            : k
        ));
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t('settings.apiKey.savePermissionsFailed', { status: res.status }));
      }
    } catch {
      setError(t('settings.apiKey.networkFailed'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ProCard className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
          <Key size={16} className="text-zinc-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{t('settings.apiKey.title')}</h3>
          <p className="text-xs text-zinc-400">{t('settings.apiKey.desc')}</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 新建密钥输入 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder={t('settings.apiKey.namePlaceholder')}
          className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
          onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerate(); }}
        />
        <Button
          variant="primary"
          size="sm"
          autoLoading={false}
          onClick={handleGenerate}
          disabled={generating}
          loading={generating}
        >
          {generating ? (
            <><Loader2 size={14} className="inline mr-1 animate-spin" />{t('settings.apiKey.generating')}</>
          ) : (
            <><span className="hidden sm:inline"><Plus size={14} className="inline mr-1" />{t('settings.apiKey.generate')}</span><span className="sm:hidden"><Plus size={14} /></span></>
          )}
        </Button>
      </div>

      {/* 创建时权限设置 */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowCreatePermissions(!showCreatePermissions)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <Shield size={12} />
          {showCreatePermissions ? t('settings.apiKey.collapsePermissions') : t('settings.apiKey.customPermissions')}
          {showCreatePermissions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {showCreatePermissions && (
          <PermissionsEditor
            permissions={newKeyPermissions}
            onChange={setNewKeyPermissions}
            className="mt-3"
          />
        )}
      </div>

      {/* 新密钥明文展示（仅一次） */}
      {showNewKey && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 mb-2 font-medium">{t('settings.apiKey.createdHint')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-amber-200 font-mono break-all">{showNewKey}</code>
            <button
              type="button"
              onClick={() => void handleCopy(showNewKey)}
              className="shrink-0 p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {copied ? <Copy size={16} className="text-green-600" /> : <Copy size={16} className="text-amber-600" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNewKey(null)}
            className="mt-2 text-xs text-amber-600 hover:underline"
          >
            {t('settings.apiKey.copiedClose')}
          </button>
        </div>
      )}

      {/* 密钥列表 */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-4">{t('settings.apiKey.loading')}</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4">{t('settings.apiKey.noKeys')}</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const isDeleting = deletingId === k.id;
            const isConfirming = confirmDeleteId === k.id;
            const isExpanded = expandedId === k.id;
            const hasRestrictedPermissions = !isFullPermissions(k.permissions);
            return (
              <div key={k.id} className="border border-zinc-100 rounded-lg overflow-hidden">
                {/* 密钥行 */}
                <div className="flex items-center justify-between p-3 bg-zinc-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleExpand(k.id)}
                      className="shrink-0 p-1 hover:bg-zinc-200 rounded transition-colors"
                      title={t('settings.apiKey.expandPermissions')}
                    >
                      {isExpanded
                        ? <ChevronDown size={14} className="text-zinc-500" />
                        : <ChevronRight size={14} className="text-zinc-500" />
                      }
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 truncate">{k.name}</p>
                        {hasRestrictedPermissions && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                            <Shield size={10} />
                            {t('settings.apiKey.restricted')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {t('settings.apiKey.createdAt', { date: formatDate(k.createdAt) })}
                        {k.lastUsed && t('settings.apiKey.lastUsedAt', { date: formatDate(k.lastUsed) })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {isConfirming ? (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          autoLoading={false}
                          loading={isDeleting}
                          onClick={() => void handleDelete(k.id)}
                          disabled={isDeleting}
                          className="whitespace-nowrap"
                        >
                          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : t('settings.apiKey.confirm')}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          autoLoading={false}
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="whitespace-nowrap"
                        >
                          {t('common.cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        iconOnly
                        autoLoading={false}
                        onClick={() => setConfirmDeleteId(k.id)}
                        disabled={isDeleting}
                        title={t('settings.apiKey.revoke')}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 展开的权限编辑面板 */}
                {isExpanded && editingPermissions && (
                  <div className="p-3 bg-white border-t border-zinc-100">
                    <PermissionsEditor
                      permissions={editingPermissions}
                      onChange={setEditingPermissions}
                    />
                    <div className="flex justify-end mt-3 pt-3 border-t border-zinc-100">
                      <Button
                        variant="primary"
                        size="sm"
                        autoLoading={false}
                        loading={savingPermissions}
                        onClick={() => void handleSavePermissions()}
                        disabled={savingPermissions}
                      >
                        {savingPermissions ? (
                          <><Loader2 size={12} className="inline mr-1 animate-spin" />{t('settings.apiKey.saving')}</>
                        ) : t('settings.apiKey.savePermissions')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ProCard>
  );
}
