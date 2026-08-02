'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { X, Clock, FileText, Check, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { CuteConfirm } from '@/components/ui/CuteConfirm';

interface Request {
  id: string;
  userId: string;
  userName: string;
  postSlug: string;
  postTitle: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export default function RequestsPage() {
  const { userRole } = useAuth();
  const { t } = useI18n();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operating, setOperating] = useState<string | null>(null);

  const hasAccess = userRole === 'sudo' || userRole === 'admin';

  useEffect(() => {
    if (!hasAccess) return;

    const controller = new AbortController();
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/requests?status=pending', { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? t('dashboard.requests.fetchFailed'));
        }

        setRequests(data.requests ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : t('dashboard.requests.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    void fetchRequests();
    return () => controller.abort();
  }, [hasAccess, t]);

  const handleApprove = async (request: Request) => {
    setOperating(request.id);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? t('dashboard.requestManage.approveFailed'));
      }

      message.success(t('dashboard.requestManage.approveSuccess'));
      setRequests(requests.filter(req => req.id !== request.id));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('dashboard.requestManage.approveFailed'));
    } finally {
      setOperating(null);
    }
  };

  const handleReject = async (id: string) => {
    setOperating(id);
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? t('dashboard.requestManage.rejectFailed'));
      }

      message.success(t('dashboard.requestManage.rejectSuccess'));
      setRequests(requests.filter(req => req.id !== id));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('dashboard.requestManage.rejectFailed'));
    } finally {
      setOperating(null);
    }
  };

  if (!hasAccess) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Only Sudo/Admin can access this page.</div>;
  }

  if (loading) {
    return <GlobalLoading />;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <PageContainer maxWidth="7xl">
      <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-100 mb-8">{t('dashboard.requestManage.title')}</h1>

      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
                <th className="p-4">{t('dashboard.requestManage.applicant')}</th>
                <th className="p-4">{t('dashboard.requestManage.article')}</th>
                <th className="p-4">{t('dashboard.requestManage.reason')}</th>
                <th className="p-4">{t('dashboard.requestManage.status')}</th>
                <th className="p-4 text-right">{t('dashboard.requestManage.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                  <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{req.userName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-zinc-400 dark:text-zinc-500" />
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{req.postTitle}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{req.postSlug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                    {req.reason ?? '-'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status === 'pending' && <Clock size={12} />}
                      {req.status === 'pending' ? t('dashboard.requestManage.pending') : req.status === 'approved' ? t('dashboard.requestManage.approved') : t('dashboard.requestManage.rejected')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(req)}
                          disabled={operating === req.id}
                        >
                          {operating === req.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </Button>
                        <CuteConfirm
                          category="delete"
                          confirmText={t('dashboard.requestManage.rejectConfirm')}
                          onConfirm={() => handleReject(req.id)}
                        >
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={operating === req.id}
                          >
                            {operating === req.id ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                          </Button>
                        </CuteConfirm>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-medium">
                    {t('dashboard.requestManage.noPending')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
