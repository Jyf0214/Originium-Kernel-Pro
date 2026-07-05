'use client';

import { useConfig } from '@/hooks/use-config';
import { MouseClickEffect } from './MouseClickEffect';
import { BackgroundParticles } from './BackgroundParticles';
import { ConfettiEffect } from './ConfettiEffect';

export { MouseClickEffect } from './MouseClickEffect';
export { BackgroundParticles } from './BackgroundParticles';
export { ConfettiEffect } from './ConfettiEffect';

/**
 * 统一效果管理器
 * 从项目配置系统读取开关状态，决定启用哪些视觉特效
 * 在 app layout 中使用
 */
export function EffectsManager() {
  const { config } = useConfig();

  const effects = config?.appearance?.effects;

  return (
    <>
      <MouseClickEffect enabled={effects?.mouseClick ?? false} />
      <BackgroundParticles enabled={effects?.backgroundParticles ?? false} />
      <ConfettiEffect enabled={effects?.confetti ?? false} trigger={effects?.confetti ?? false} />
    </>
  );
}
