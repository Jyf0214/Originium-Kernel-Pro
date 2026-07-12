/**
 * 媒体嵌入组件
 * 根据文件扩展名（mp4/webm/ogg/mp3/wav/flac/aac）渲染原生 <video> 或 <audio> 播放器。
 */
import { type ReactNode } from 'react';

/* ── URL 匹配规则 ── */

/** 匹配视频/音频 URL 的正则 */
export const MEDIA_URL_RE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i;

/* ── 主组件 ── */

/** 媒体嵌入组件：根据文件类型渲染 <video> 或 <audio> */
export function MediaEmbed({ href, children }: { href?: string; children?: ReactNode }) {
  if (!href || !MEDIA_URL_RE.test(href)) return <a href={href}>{children}</a>;

  const ext = href.match(/\.(\w+)(\?.*)?$/)?.[1]?.toLowerCase() ?? '';
  const isAudio = ['mp3', 'ogg', 'wav', 'flac', 'aac'].includes(ext);

  if (isAudio) {
    return (
      <div className="my-6">
        <audio controls preload="metadata" className="w-full rounded-xl">
          <source src={href} />
          您的浏览器不支持音频播放。
        </audio>
      </div>
    );
  }

  return (
    <div className="my-6">
      <video controls preload="metadata" className="w-full rounded-xl" playsInline>
        <source src={href} />
        您的浏览器不支持视频播放。
      </video>
    </div>
  );
}
