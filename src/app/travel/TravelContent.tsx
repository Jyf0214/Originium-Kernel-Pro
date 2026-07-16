'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Calendar } from 'lucide-react';
import { ProCard } from '@/components/ui/ProCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeroBanner } from '@/components/ui/HeroBanner';
import type { TravelPlace } from '@/lib/travel';
import { EASE_STANDARD, staggerDelay } from '@/components/ui/motion';

interface TravelContentProps {
  places: TravelPlace[];
}

/** 单个时间线地点卡片 */
function TimelineItem({
  place,
  index,
  isLast,
}: {
  place: TravelPlace;
  index: number;
  isLast: boolean;
}) {
  return (
    <motion.div
      className="relative flex gap-6 sm:gap-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.4,
        ease: EASE_STANDARD,
        delay: staggerDelay(index, 0.08),
      }}
    >
      {/* 左侧时间线 */}
      <div className="flex flex-col items-center shrink-0">
        {/* 圆点标记 */}
        <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg sm:text-xl shadow-lg shadow-blue-500/25">
          {place.emoji}
        </div>
        {/* 连接线 */}
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-blue-300 to-zinc-200 dark:from-blue-700 dark:to-zinc-700 min-h-[2rem]" />
        )}
      </div>

      {/* 右侧卡片 */}
      <div className="flex-1 pb-8 sm:pb-12 min-w-0">
        <ProCard hoverable className="h-full">
          <div className="flex flex-col gap-3">
            {/* 标题行：地名 + 国家 */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {place.name}
              </h3>
              <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full border border-zinc-200 dark:border-zinc-600">
                {place.country}
              </span>
            </div>

            {/* 日期 */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
              <Calendar size={14} className="shrink-0" />
              <span>{place.date}</span>
            </div>

            {/* 描述 */}
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {place.description}
            </p>

            {/* 坐标信息 */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 dark:text-zinc-600">
              <MapPin size={12} className="shrink-0" />
              <span>
                {place.coordinates[0].toFixed(2)}, {place.coordinates[1].toFixed(2)}
              </span>
            </div>
          </div>
        </ProCard>
      </div>
    </motion.div>
  );
}

export function TravelContent({ places }: TravelContentProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white sm:bg-zinc-50 dark:bg-white sm:dark:bg-zinc-900">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 md:py-20">
        {/* 顶部 Banner */}
        <HeroBanner
          title="旅行足迹"
          description="记录走过的每一个地方"
          size="compact"
          className="mb-10 sm:mb-14"
        />

        {/* 空状态 */}
        {places.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} className="text-zinc-300 dark:text-zinc-600" />}
            title="暂无旅行记录"
            description="还没有添加旅行地点，去探索世界吧"
          />
        ) : (
          /* 时间线布局 */
          <div className="relative pl-4 sm:pl-6">
            {places.map((place, index) => (
              <TimelineItem
                key={`${place.name}-${place.date}`}
                place={place}
                index={index}
                isLast={index === places.length - 1}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
