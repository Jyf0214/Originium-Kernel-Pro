'use client';

import { useState } from 'react';
import { Plus, Settings, ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useDiaryState } from './use-diary-state';
import { DiaryFilters, GroupTabs } from './DiaryFilters';
import { DiaryCard } from './DiaryCard';
import { DiarySettingsPanel } from './DiarySettingsPanel';
import { SecurityInfoModal } from './SecurityInfoModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { useI18n } from '@/hooks/use-i18n';

export function DiaryPageClient() {
  const s = useDiaryState();
  const { t } = useI18n();
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [versionHistoryDiaryId, setVersionHistoryDiaryId] = useState<string | null>(null);

  if (s.authLoading || (s.loading && s.diaries.length === 0 && !s.isAuthorized)) {
    return <GlobalLoading />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <PageContainer maxWidth="4xl" padding="compact">
        {s.isAuthorized && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <Button
              variant="primary"
              size="md"
              autoLoading={false}
              onClick={() => s.router.push('/diary/new')}
              icon={<Plus size={14} />}
            >
              <span className="hidden sm:inline">{t('diary.newEntry')}</span>
            </Button>
            <Button
              variant={showSettings ? 'primary' : 'secondary'}
              size="md"
              autoLoading={false}
              onClick={() => setShowSettings(!showSettings)}
              icon={<Settings size={14} />}
              title={t('diary.settings')}
            >
              <span className="hidden sm:inline">{t('common.settings')}</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              autoLoading={false}
              onClick={() => s.router.push('/diary/drafts')}
              icon={<FileText size={14} />}
            >
              <span className="hidden sm:inline">{t('diary.drafts')}</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              autoLoading={false}
              onClick={() => setShowSecurityInfo(true)}
              icon={<ShieldAlert size={14} />}
              className="text-amber-600 hover:bg-amber-50"
              title={t('diary.securityPrivacyTitle')}
            >
              <span className="hidden sm:inline">{t('diary.securityPrivacy')}</span>
            </Button>
          </div>
        )}

        <DiaryFilters
          searchText={s.searchText}
          setSearchText={s.setSearchText}
          startDate={s.startDate}
          setStartDate={s.setStartDate}
          endDate={s.endDate}
          setEndDate={s.setEndDate}
        />

        <GroupTabs
          groups={s.groups}
          activeGroup={s.activeGroup}
          onSelect={s.setActiveGroup}
        />

        {showSettings && (
          <DiarySettingsPanel
            exportLoading={s.exportLoading}
            onExport={s.handleExport}
          />
        )}

        {s.loading ? (
          <div className="flex items-center justify-center py-24 sm:py-32">
            <Loader2 size={24} className="sm:size-8 text-zinc-300 animate-spin" />
          </div>
        ) : s.diaries.length === 0 ? (
          <EmptyState
            description={t('diary.noDiaries')}
            action={
              s.isAuthorized ? (
                <Button
                  variant="primary"
                  size="lg"
                  autoLoading={false}
                  onClick={() => s.router.push('/diary/new')}
                  icon={<Plus size={18} />}
                >
                  {t('diary.writeFirst')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4 overflow-x-auto">
            {s.diaries.map((d) => (
              <DiaryCard
                key={d.id}
                diary={d}
                viewingId={s.viewingId}
                viewContent={s.viewContent}
                viewLoading={s.viewLoading}
                deleting={s.deleting}
                pinning={s.pinning}
                isAdmin={s.isAuthorized}
                onView={s.handleView}
                onTogglePin={s.handleTogglePin}
                onEdit={(id) => s.router.push(`/diary/${id}/edit`)}
                onDelete={s.handleDelete}
                onVersionHistory={s.isAuthorized ? (id) => setVersionHistoryDiaryId(id) : undefined}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {showSecurityInfo && <SecurityInfoModal onClose={() => setShowSecurityInfo(false)} />}
      {versionHistoryDiaryId && (
        <VersionHistoryModal
          open
          diaryId={versionHistoryDiaryId}
          onClose={() => setVersionHistoryDiaryId(null)}
        />
      )}
    </div>
  );
}
