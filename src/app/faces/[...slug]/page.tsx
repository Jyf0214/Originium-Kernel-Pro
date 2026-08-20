'use client';

import React from 'react';
import { type ContentFile } from '@/types/content';
import { Avatar } from '@/components/Avatar';
import { LazyMarkdownRenderer as MarkdownRenderer } from '@/components/MarkdownRenderer/dynamic';
import { BacklinkPanel } from '@/components/BacklinkPanel';
import Link from 'next/link';
import { ArrowLeft, Code, Eye, Pencil } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import { TOC } from '@/components/ui/TOC';
import { notFound, useParams } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <GlobalLoading size="large" />
    </div>
  );
}

function BreadcrumbsNav({ slugArray }: { slugArray: string[] }) {
  const { t } = useI18n();
  const breadcrumbs = slugArray.map((segment, index) => ({
    label: segment,
    href: '/faces/' + slugArray.slice(0, index + 1).join('/'),
    isLast: index === slugArray.length - 1,
  }));

  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 mb-8 flex-wrap">
      <Link href="/faces" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1">
        <ArrowLeft size={14} />
        {t('nav.faces')}
      </Link>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-2">
          <span>/</span>
          {crumb.isLast ? (
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function FaceDetailHeader({ file, isRoot, rawContent, showRaw, setShowRaw, fullPath }: {
  file: ContentFile;
  isRoot: boolean;
  rawContent: string;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
  fullPath: string;
}) {
  const { config: siteConfig } = useConfig();
  const { t } = useI18n();
  return (
    <header className="mb-12 text-center">
      <div className="flex justify-center mb-6">
        <Avatar
          name={file.meta.title}
          size={128}
          fallbackImg={siteConfig?.errorImg?.flink}
        />
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
        {file.meta.title}
      </h1>
      {file.meta.description && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">{file.meta.description}</p>
      )}
      {file.meta.tags && file.meta.tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {file.meta.tags.map((tag: string) => (
            <Tag key={tag} variant="light" size="md">
              {tag}
            </Tag>
          ))}
        </div>
      )}
      {isRoot && rawContent && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href={`/faces/edit${fullPath}`}>
            <Button
              variant="secondary"
              size="sm"
              autoLoading={false}
              icon={<Pencil size={18} />}
            >
              {t('faces.editContact')}
            </Button>
          </Link>
          <Button
            onClick={() => setShowRaw(!showRaw)}
            variant="ghost"
            size="sm"
            autoLoading={false}
            icon={showRaw ? <Eye size={18} /> : <Code size={18} />}
          >
            {showRaw ? t('faces.previewRender') : t('faces.viewRaw')}
          </Button>
        </div>
      )}
    </header>
  );
}

function FaceDetailContent({ file, showRaw, rawContent, fullPath }: {
  file: ContentFile;
  showRaw: boolean;
  rawContent: string;
  fullPath: string;
}) {
  const { config: siteConfig } = useConfig();
  return (
    <div className="max-w-3xl mx-auto">
      {showRaw && rawContent ? (
        <pre className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {rawContent}
        </pre>
      ) : (
        <MarkdownRenderer content={file.content} highlight={siteConfig?.highlight} />
      )}
      {/* 关联引用面板（客户端动态加载） */}
      {!showRaw && (
        <BacklinkPanel section="faces" slug={fullPath} />
      )}
    </div>
  );
}

export default function FaceDetailPage() {
  const params = useParams();
  const slugArray = params?.slug as string[] || [];
  const fullPath = '/' + slugArray.join('/');
  const { isRoot } = useAuth();
  const { t } = useI18n();
  const { config } = useConfig();

  const [file, setFile] = React.useState<ContentFile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [showRaw, setShowRaw] = React.useState(false);
  const [rawContent, setRawContent] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/faces${fullPath}`);
        if (res.ok) {
          const contentFile = await res.json();
          setFile(contentFile);
          if (contentFile.rawContent) {
            setRawContent(contentFile.rawContent);
          }
        } else if (res.status === 404) {
          setFile(null);
        } else {
          // 其它错误状态（500/403 等）：明确提示，不伪装成"页面不存在"
          setLoadFailed(true);
        }
      } catch (err) {
        console.error('Failed to fetch face details:', err);
        setLoadFailed(true);
        showError(t('faces.detailLoadFailed'));
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [fullPath, t]);

  if (loading) return <LoadingView />;
  if (loadFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-900 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <ArrowLeft size={24} className="text-red-400 rotate-180" />
        </div>
        <div>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{t('faces.detailLoadFailed')}</p>
          <Link href="/faces" className="mt-3 inline-block text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            {t('faces.backToFaces')}
          </Link>
        </div>
      </div>
    );
  }
  if (!file) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <PageContainer maxWidth="4xl">
        <BreadcrumbsNav slugArray={slugArray} />
        <article>
          <FaceDetailHeader
            file={file}
            isRoot={isRoot}
            rawContent={rawContent}
            showRaw={showRaw}
            setShowRaw={setShowRaw}
            fullPath={fullPath}
          />
          <FaceDetailContent file={file} showRaw={showRaw} rawContent={rawContent} fullPath={fullPath} />
        </article>
        {/* 页面级目录（toc.page 开启时显示，服务 faces 长文页） */}
        {config?.toc?.page === true && (
          <TOC
            content={rawContent || file.content}
            config={{
              number: config.toc.number,
              expand: config.toc.expand,
              styleSimple: config.toc.styleSimple,
            }}
          />
        )}
      </PageContainer>
    </div>
  );
}
