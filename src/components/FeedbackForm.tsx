'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export function FeedbackForm() {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('feedback');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const categoryOptions = [
    { value: 'bug', label: t('feedback.bugReport') },
    { value: 'feature', label: t('feedback.featureRequest') },
    { value: 'feedback', label: t('feedback.generalFeedback') },
  ];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setErrorMessage(t('feedback.fillTitleAndContent'));
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
      });

      const data = await res.json() as { error?: string; success?: boolean };

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? t('feedback.submitFailed'));
        return;
      }

      setStatus('success');
      setTitle('');
      setBody('');
      setCategory('feedback');
    } catch {
      setStatus('error');
      setErrorMessage(t('feedback.networkError'));
    }
  }, [title, body, category, t]);

  const resetForm = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  // 提交成功
  if (status === 'success') {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{t('feedback.thanksTitle')}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {t('feedback.thanksMessage')}
        </p>
        <Button variant="default" size="sm" onClick={resetForm} autoLoading={false}>
          {t('feedback.continueSubmit')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t('feedback.submitTitle')}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
        {t('feedback.submitDescription')}
      </p>

      <div className="space-y-4">
        <Select
          label={t('feedback.category')}
          size="md"
          rounded="sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Input
          label={t('feedback.titleLabel')}
          size="md"
          rounded="sm"
          placeholder={t('feedback.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />

        <Textarea
          label={t('feedback.contentLabel')}
          minH="min-h-[140px]"
          rounded="md"
          placeholder={t('feedback.contentPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
        />

        {status === 'error' && errorMessage && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Send size={14} />}
            loading={status === 'submitting'}
          >
            {t('feedback.submitButton')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default FeedbackForm;
