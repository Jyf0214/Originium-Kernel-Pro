'use client';

import { useConfig } from '@/hooks/use-config';

export default function RewardArea() {
  const { config } = useConfig();
  const cfg = config?.reward;

  if (!cfg?.enable || !cfg.qrCodes?.length) return null;

  const validQrs = cfg.qrCodes.filter(q => q.img);

  if (!validQrs.length) return null;

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100 text-center">
      <div className="bg-zinc-50 rounded-2xl p-8">
        <h3 className="text-lg font-black text-zinc-900 mb-2">赞赏</h3>
        <p className="text-sm text-zinc-400 mb-6">如果觉得我的文章对你有用，请随意赞赏</p>
        <div className="flex justify-center gap-6 flex-wrap">
          {validQrs.map((qr, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-28 h-28 bg-white rounded-xl border border-zinc-200 p-2 shadow-sm">
                <img
                  src={qr.img}
                  alt={qr.text || `QR ${i}`}
                  className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {qr.text && (
                <span className="text-xs font-medium text-zinc-500">{qr.text}</span>
              )}
              {qr.link && (
                <a
                  href={qr.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
                >
                  {qr.link}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
