import type { StatCardData } from '../_lib/types';

/** 渲染趋势箭头 SVG */
function TrendIcon({ card }: { card: StatCardData }) {
  if (!card.trend) return null;
  if (card.trend.direction === 'up') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M5 1L9 5H6V9H4V5H1L5 1Z"
          className={card.trend.rate >= 50 ? 'fill-emerald-500' : 'fill-amber-500'}
        />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 9L1 5H4V1H6V5H9L5 9Z" className="fill-red-400" />
    </svg>
  );
}

/** 单个统计卡(图标 + 数值 + 趋势 + 进度条) */
export function StatCard({ card }: { card: StatCardData }) {
  const Icon = card.icon;
  const trendColor = card.trend && card.trend.rate >= 50 ? 'text-emerald-600' : 'text-zinc-500';

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 hover:shadow-lg hover:shadow-zinc-100 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className={card.textColor} />
        </div>
        {card.trend && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50">
            <TrendIcon card={card} />
            <span className={`text-[11px] font-semibold ${trendColor}`}>
              {card.trend.rate}%
            </span>
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-zinc-900 mb-1 truncate">{card.value}</div>
      <div className="text-xs text-zinc-400 font-medium mb-3">{card.title}</div>
      {card.progress && (
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${card.progress.color} rounded-full transition-all duration-700`}
            style={{ width: `${card.progress.value}%` }}
          />
        </div>
      )}
    </div>
  );
}
