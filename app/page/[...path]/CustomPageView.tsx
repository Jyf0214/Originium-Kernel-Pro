'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Shield, User, ExternalLink, MessageSquare } from 'lucide-react';

interface CustomPageViewProps {
  html: string;
  title?: string;
  creator?: string;
  pagePath: string;
  siteTitle: string;
}

/**
 * 自定义页面沙箱视图
 *
 * 将用户 HTML 渲染在 iframe 沙箱中，顶部工具栏显示管理员/创建者信息和工单入口。
 * 自定义页面通过 page-sdk.js 与主系统通信。
 */
export default function CustomPageView({ html, title, creator, pagePath, siteTitle }: CustomPageViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [expanded, setExpanded] = useState(false);

  const srcDoc = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body>
<script src="/page-sdk.js"><\/script>
${html}
</body>
</html>`;

  // 自动调整 iframe 高度
  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    const body = iframe.contentDocument.body;
    const height = Math.max(body.scrollHeight, body.offsetHeight, 400);
    setIframeHeight(height);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      adjustHeight();
      // 监听内容变化（SPA 路由、动态内容）
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const observer = new MutationObserver(adjustHeight);
          observer.observe(doc.body, { childList: true, subtree: true });
          return () => observer.disconnect();
        }
      } catch { /* 跨域限制 */ }
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [adjustHeight]);

  // 打开工单页面（预填页面信息）
  const openTicket = () => {
    const params = new URLSearchParams({ pagePath, pageTitle: title ?? '' });
    window.open(`/tickets/new?${params.toString()}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-10 flex items-center justify-between text-xs">
          {/* 左侧：站点 + 创建者 */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 shrink-0">
              <Shield size={13} />
              <span className="font-medium truncate max-w-[120px]">{siteTitle}</span>
            </div>
            {creator && (
              <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 shrink-0">
                <User size={12} />
                <span className="truncate max-w-[100px]">{creator}</span>
              </div>
            )}
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openTicket}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title="提交工单"
            >
              <MessageSquare size={13} />
              <span className="hidden sm:inline">工单</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title={expanded ? '收起' : '展开'}
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">{expanded ? '收起' : '展开'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* iframe 沙箱 */}
      <div className={expanded ? '' : 'max-w-5xl mx-auto px-4 py-4'}>
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={title ?? '自定义页面'}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="w-full border-0 bg-white dark:bg-zinc-900 rounded-lg shadow-sm"
          style={{ height: iframeHeight }}
        />
      </div>
    </div>
  );
}
