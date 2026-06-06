import type { StatCardData } from '../_lib/types';
import { StatCard } from './StatCard';

/** 统计卡网格容器(响应式 1 / 3 列) */
export function StatCardGrid({ cards }: { cards: StatCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {cards.map((card, index) => (
        <StatCard key={index} card={card} />
      ))}
    </div>
  );
}
