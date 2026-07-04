'use client';

import { useRef } from 'react';
import { motion, type Variants } from 'motion/react';
import { Calendar, User } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { useCoverParallax } from '@/hooks/useCoverParallax';
import { EASE_STANDARD } from '@/components/ui/motion';

interface PostHeaderProps {
  type?: unknown;
  tags?: unknown;
  title: unknown;
  author?: unknown;
  date?: unknown;
  cover?: unknown;
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
}: {
  titleStr: string;
  authorStr?: string;
  dateStr?: string;
  typeStr?: string;
  tagsArr: string[];
  coverStr: string;
  /** 全屏宽模式：去掉负 margin 和圆角，封面撑满视口 */
  fullBleed?: boolean;
}) {
  const coverRef = useRef<HTMLDivElement>(null);
  const parallax = useCoverParallax(coverRef);

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
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(${coverStr})`,
            filter: fullBleed ? 'blur(8px) brightness(0.55)' : 'blur-sm',
          }}
        />
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
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col justify-end aspect-video p-8 sm:p-10"
      >
        {typeStr && (
          <motion.div variants={itemVariants} className="mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
              typeStr === 'original'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
            }`}>
              {typeStr === 'original' ? '原创' : '转载'}
            </span>
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
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <User size={14} className="text-white/80" />
                </div>
                <span className="font-medium text-white/90">{authorStr}</span>
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

/* ── 简洁头部（无封面） ── */

function SimpleHeader({
  titleStr,
  authorStr,
  dateStr,
  typeStr,
  tagsArr,
}: {
  titleStr: string;
  authorStr?: string;
  dateStr?: string;
  typeStr?: string;
  tagsArr: string[];
}) {
  return (
    <motion.header
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mb-12"
    >
      {typeStr && (
        <motion.div variants={itemVariants} className="mb-4">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
            typeStr === 'original'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
          }`}>
            {typeStr === 'original' ? '原创' : '转载'}
          </span>
        </motion.div>
      )}
      {tagsArr.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-5">
          {tagsArr.map((tag) => (
            <Tag key={tag} variant="dark" size="md">
              {tag}
            </Tag>
          ))}
        </motion.div>
      )}
      <motion.h1
        variants={itemVariants}
        className="text-4xl md:text-[3.5rem] font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-8 leading-[1.1]"
      >
        {titleStr}
      </motion.h1>
      {(authorStr ?? dateStr) && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-sm">
          {authorStr && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                <User size={14} className="text-zinc-500 dark:text-zinc-400" />
              </div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{authorStr}</span>
            </div>
          )}
          {dateStr && (
            <time className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
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
    </motion.header>
  );
}

export function PostHeader({ type, tags, title, author, date, cover }: PostHeaderProps) {
  const typeStr = typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const coverStr = typeof cover === 'string' ? cover : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  if (coverStr) {
    return <CoverHero titleStr={titleStr} authorStr={authorStr} dateStr={dateStr} typeStr={typeStr} tagsArr={tagsArr} coverStr={coverStr} />;
  }

  return <SimpleHeader titleStr={titleStr} authorStr={authorStr} dateStr={dateStr} typeStr={typeStr} tagsArr={tagsArr} />;
}
