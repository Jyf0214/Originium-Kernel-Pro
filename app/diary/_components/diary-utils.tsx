import type { DiaryReference } from './types';

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function renderReferenceLinks(refs: DiaryReference[] | undefined) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-zinc-100">
      <p className="text-xs font-medium text-zinc-400 mb-2">引用</p>
      <div className="flex flex-wrap gap-2">
        {refs.map((ref: DiaryReference, i: number) => (
          <a key={i} href={ref.type === 'diary' ? '#' : ref.type === 'face' ? `/faces${ref.slug}` : ref.slug}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
            target={ref.type === 'diary' ? undefined : '_blank'}
          >
            {ref.title}
          </a>
        ))}
      </div>
    </div>
  );
}
