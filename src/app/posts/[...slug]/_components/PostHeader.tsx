'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, type Variants } from 'motion/react';
import Image from 'next/image';
import { Calendar, User } from 'lucide-react';
import { useCoverParallax } from '@/hooks/useCoverParallax';
import { EASE_STANDARD } from '@/components/ui/motion';
import type { AuthorInfo } from '@/types/author';

/** 原创/转载标识徽章 — 跨上下文共享 */
function TypeBadge({
  typeStr,
  variant = 'light',
}: {
  typeStr: string;
  variant?: 'overlay' | 'light';
}) {
  const isOriginal = typeStr === 'original';
  const base = 'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest';
  const overlay = isOriginal
    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-sm'
    : 'bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-sm';
  const light = isOriginal
    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700';
  return (
    <span className={`${base} ${variant === 'overlay' ? overlay : light}`}>
      {isOriginal ? '原创' : '转载'}
    </span>
  );
}

/** 作者头像：有 avatar 显示图片，否则显示占位图标 */
function AuthorAvatar({
  authorInfo,
  name,
  size = 8,
  ringClass = '',
  fallbackBg = 'bg-white/20 backdrop-blur-sm',
  fallbackIconClass = 'text-white/80',
}: {
  authorInfo?: AuthorInfo | null;
  name: string;
  size?: number;
  ringClass?: string;
  fallbackBg?: string;
  fallbackIconClass?: string;
}) {
  const px = `w-${size} h-${size}`;
  if (authorInfo?.avatar) {
    return (
      <img
        src={authorInfo.avatar}
        alt={authorInfo.nickname ?? name}
        className={`${px} rounded-full object-cover ${ringClass}`}
      />
    );
  }
  return (
    <div className={`${px} ${fallbackBg} rounded-full flex items-center justify-center`}>
      <User size={14} className={fallbackIconClass} />
    </div>
  );
}

interface PostHeaderProps {
  type?: unknown;
  tags?: unknown;
  title: unknown;
  author?: unknown;
  date?: unknown;
  cover?: unknown;
  authorInfo?: AuthorInfo | null;
}

/* ── 入场动画变体 ── */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_STANDARD } },
};

/* ── 封面 Hero ── */

export function CoverHero({
  titleStr,
  authorStr,
  dateStr,
  typeStr,
  tagsArr,
  coverStr,
  fullBleed = false,
  authorInfo,
}: {
  titleStr: string;
  authorStr?: string;
  dateStr?: string;
  typeStr?: string;
  tagsArr: string[];
  coverStr?: string;
  /** 全屏宽模式：去掉负 margin 和圆角，封面撑满视口 */
  fullBleed?: boolean;
  authorInfo?: AuthorInfo | null;
}) {
  const coverRef = useRef<HTMLDivElement>(null);
  const parallax = useCoverParallax(coverRef);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className={`relative overflow-hidden ${fullBleed ? 'aspect-video mb-0' : '-m-6 sm:-m-8 md:-m-10 lg:-m-12 mb-12 rounded-t-3xl'}`}>
      {/* 封面图片层 — 艺术化处理：旋转 + 模糊 + 暗化 + 缩放视差 */}
      <div
        ref={coverRef}
        className="absolute inset-0"
        style={{
          transform: `scale(${parallax.scale}) translateY(${parallax.translateY}px)`,
          willChange: 'transform',
        }}
      >
        {coverStr ? (
          <Image
            src={coverStr}
            alt=""
            fill
            sizes="100vw"
            className="absolute inset-0 object-cover scale-110"
            style={{
              filter: fullBleed ? 'blur(8px) brightness(0.55)' : 'blur-sm',
            }}
            priority
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 scale-110"
            style={{ filter: 'blur(0px) brightness(0.55)' }}
          />
        )}
        {/* 渐变遮罩层 — 从底部到顶部的暗度过渡 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        {/* 暗角效果 — 四周渐暗，聚焦中心 */}
        <div
          className="absolute inset-0 md:block hidden"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          }}
        />
        {/* inset box-shadow 光晕 — 模拟 Anzhiyu 主题色光晕效果 */}
        {fullBleed && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 80px -100px 250px 50px rgba(99, 102, 241, 0.15)',
            }}
          />
        )}
        {/* 暗色模式氛围层 — 额外压暗 */}
        <div className="absolute inset-0 bg-black/0 dark:bg-black/20 transition-colors duration-300" />
      </div>

      {/* 底部渐变过渡 — 从封面色过渡到页面背景色 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-black/20 to-zinc-50 dark:to-zinc-900 z-[1]" />

      {/* 内容区 — 入场动画 */}
      <motion.div
        variants={containerVariants}
        initial={mounted ? "hidden" : "visible"}
        animate="visible"
        className="relative z-10 flex flex-col justify-end aspect-video p-8 sm:p-10"
      >
        {typeStr && (
          <motion.div variants={itemVariants} className="mb-4">
            <TypeBadge typeStr={typeStr} variant="overlay" />
          </motion.div>
        )}
        {tagsArr.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-4">
            {tagsArr.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 backdrop-blur-sm text-white/80 border border-white/10">
                {tag}
              </span>
            ))}
          </motion.div>
        )}
        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-4xl md:text-[3.5rem] font-black tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg"
        >
          {titleStr}
        </motion.h1>
        {(authorStr ?? dateStr) && (
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            {authorStr && (
              <div className="flex items-center gap-2">
                <AuthorAvatar
                  authorInfo={authorInfo}
                  name={authorStr}
                  ringClass="ring-2 ring-white/20"
                />
                <span className="font-medium text-white/90">{authorInfo?.nickname ?? authorStr}</span>
              </div>
            )}
            {dateStr && (
              <time className="flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(dateStr).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </motion.div>
        )}
      </motion.div>
    </header>
  );
}

export function PostHeader({ type, tags, title, author, date, cover, authorInfo }: PostHeaderProps) {
  const typeStr = typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const coverStr = typeof cover === 'string' ? cover : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  return <CoverHero titleStr={titleStr} authorStr={authorStr} dateStr={dateStr} typeStr={typeStr} tagsArr={tagsArr} coverStr={coverStr} authorInfo={authorInfo} />;
}
