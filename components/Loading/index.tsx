'use client';

import { useMemo } from 'react';
import { Spin } from 'antd';
import { Loader2 } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd' | 'progress';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface LoadingConfig {
  type: LoadingType;
  color: string;
  position?: LoadingPosition;
}

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  color?: string;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const positionClasses: Record<string, string> = {
  center: 'items-center justify-center',
  'top-left': 'items-start justify-start pt-10 pl-10',
  'top-right': 'items-start justify-end pt-10 pr-10',
  'bottom-left': 'items-end justify-start pb-10 pl-10',
  'bottom-right': 'items-end justify-end pb-10 pr-10',
};

export function LoadingSpinner({ size = 'large', tip, position = 'center' }: LoadingProps) {
  const posClass = positionClasses[position] ?? positionClasses.center;
  return (
    <div className={`flex ${posClass}`}>
      <Spin size={size} tip={tip} />
    </div>
  );
}

export function LoadingText({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500">{tip}</span>
      <span className="loading-dots">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

export function LoadingDots({ tip = 'Loading', color = '#c084fc' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="loading-dots-animated">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === 0 ? color : i === 1 ? `${color}cc` : `${color}88`,
            }}
          />
        ))}
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
    </div>
  );
}

export function LoadingGlow({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="loading-glow-container">
        <div className="loading-glow-circle" />
        <div className="loading-glow-inner" />
      </div>
      {tip && <span className="text-sm text-zinc-500 animate-pulse">{tip}</span>}
    </div>
  );
}

export function LoadingWaves({ tip = 'Loading...', color = '#c084fc' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-1.5 h-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 rounded-full animate-wave"
            style={{
              height: '40%',
              backgroundColor: color,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
    </div>
  );
}

export function LoadingAntIcon({ size = 'large', tip, color = '#c084fc', position = 'center' }: LoadingProps) {
  const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
  const antIcon = <Loader2 size={fontSize} className="animate-spin" style={{ color }} />;
  const posClass = positionClasses[position] ?? positionClasses.center;
  return (
    <div className={`flex ${posClass}`}>
      <Spin indicator={antIcon} size={size} tip={tip} />
    </div>
  );
}

interface GlobalLoadingProps extends LoadingProps {
  type?: LoadingType;
  forNavigation?: boolean;
  loadingConfig?: {
    page?: LoadingConfig;
    navigation?: { type: LoadingType; color: string };
    slogans?: string[];
  };
  slogans?: string[];
}

interface ResolvedLoadingConfig {
  type: LoadingType;
  color: string;
  position: LoadingPosition;
}

function resolveNavConfig(type: LoadingType | undefined, color: string | undefined, loadingConfig: GlobalLoadingProps['loadingConfig']): Pick<ResolvedLoadingConfig, 'type' | 'color'> {
  return {
    type: type ?? loadingConfig?.navigation?.type ?? 'antd',
    color: color ?? loadingConfig?.navigation?.color ?? '#c084fc',
  };
}

function resolvePageConfig(type: LoadingType | undefined, color: string | undefined, position: LoadingPosition | undefined, loadingConfig: GlobalLoadingProps['loadingConfig']): ResolvedLoadingConfig {
  return {
    type: type ?? loadingConfig?.page?.type ?? 'waves',
    color: color ?? loadingConfig?.page?.color ?? '#c084fc',
    position: position ?? loadingConfig?.page?.position ?? 'center',
  };
}

function resolveLoadingConfig(props: GlobalLoadingProps): ResolvedLoadingConfig {
  const { type, color, position, forNavigation, loadingConfig } = props;
  if (forNavigation) {
    const navConfig = resolveNavConfig(type, color, loadingConfig);
    return { ...navConfig, position: 'center' };
  }
  return resolvePageConfig(type, color, position, loadingConfig);
}

function LoadingRenderer({ finalType, finalColor, finalPosition, size, tip }: {
  finalType: LoadingType;
  finalColor: string;
  finalPosition: LoadingPosition;
  size?: 'small' | 'default' | 'large';
  tip?: string;
}) {
  switch (finalType) {
    case 'spinner':
      return <LoadingSpinner size={size} tip={tip} position={finalPosition} />;
    case 'text':
      return <LoadingText tip={tip} />;
    case 'dots':
      return <LoadingDots tip={tip} color={finalColor} />;
    case 'glow':
      return <LoadingGlow tip={tip} />;
    case 'waves':
      return <LoadingWaves tip={tip} color={finalColor} />;
    case 'antd':
      return <LoadingAntIcon size={size} tip={tip} color={finalColor} position={finalPosition} />;
    case 'progress':
      return <ProgressBar color={finalColor} />;
    default:
      return <LoadingSpinner size={size} tip={tip} position={finalPosition} />;
  }
}

export function GlobalLoading(props: GlobalLoadingProps) {
  const { type, size, tip, color, position, forNavigation, loadingConfig, slogans: directSlogans } = props;
  const resolved = resolveLoadingConfig({ type, size, tip, color, position, forNavigation, loadingConfig });

  // 随机选择一条标语
  const sloganList = directSlogans ?? loadingConfig?.slogans;
  const slogan = useMemo(() => {
    if (!sloganList || sloganList.length === 0) return null;
    return sloganList[Math.floor(Math.random() * sloganList.length)] ?? null;
  }, [sloganList]);

  return (
    <div className="flex flex-col items-center gap-6">
      <LoadingRenderer finalType={resolved.type} finalColor={resolved.color} finalPosition={resolved.position} size={size} tip={tip} />
      {slogan && (
        <p className="text-sm text-zinc-400 select-none animate-pulse">
          {slogan}
        </p>
      )}
    </div>
  );
}

export default GlobalLoading;