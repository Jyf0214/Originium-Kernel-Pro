'use client';

/**
 * 视频嵌入组件：检测 YouTube / Bilibili 链接，替换为 iframe 嵌入播放器。
 * 在 MarkdownRenderer 的 link 组件中调用，匹配成功则返回嵌入式播放器。
 */
import { cn } from '@/lib/ui';

/* ── URL 匹配规则 ── */

/** YouTube 视频 ID 提取正则 */
const YT_RE =
  /(?:youtube\.com\/watch\?[^\s]*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/;

/** Bilibili BV 号提取正则 */
const BILI_RE = /bilibili\.com\/video\/(BV[A-Za-z0-9]+)/;

/* ── 嵌入容器样式 ── */

const EMBED_WRAPPER =
  'relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 my-6';

/* ── 公共 API ── */

/**
 * 尝试从 URL 中提取视频嵌入信息。
 * 返回 null 表示不是受支持的视频链接。
 */
export function parseVideoUrl(
  href: string,
): { type: 'youtube'; id: string } | { type: 'bilibili'; bvid: string } | null {
  const ytMatch = YT_RE.exec(href);
  if (ytMatch?.[1]) {
    return { type: 'youtube', id: ytMatch[1] };
  }

  const biliMatch = BILI_RE.exec(href);
  if (biliMatch?.[1]) {
    return { type: 'bilibili', bvid: biliMatch[1] };
  }

  return null;
}

/** YouTube 嵌入播放器 */
function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className={cn(EMBED_WRAPPER)}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube 视频"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

/** Bilibili 嵌入播放器 */
function BilibiliEmbed({ bvid }: { bvid: string }) {
  return (
    <div className={cn(EMBED_WRAPPER)}>
      <iframe
        src={`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0`}
        title="Bilibili 视频"
        allowFullScreen
        loading="lazy"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

/**
 * 通用视频嵌入组件：根据 URL 类型自动选择播放器。
 * 如果 URL 不匹配任何视频规则，返回 null（由调用方回退到普通链接）。
 */
export function VideoEmbed({ href }: { href: string }) {
  const info = parseVideoUrl(href);
  if (!info) return null;

  if (info.type === 'youtube') {
    return <YouTubeEmbed videoId={info.id} />;
  }

  if (info.type === 'bilibili') {
    return <BilibiliEmbed bvid={info.bvid} />;
  }

  return null;
}
