// Footer - 页脚主组件
// 负责装配：链接组、徽章、运行时状态、版权底栏（含回到顶部）。
// 所有配置加载、默认值兜底、动画变体均来自 footer-config / 子组件本身。
// 支持通过 props 传入静态配置（构建时生成），优先使用 props，无则回退 API。

'use client';

import { motion } from 'motion/react';

import { FooterLinkGroups, FooterBadges } from './FooterLinks';
import { FooterRuntimeStatus } from './FooterBrand';
import { FooterBar } from './FooterCopyright';
import {
  useFooterConfig,
  resolveDefaults,
} from './footer-config';
import type { FooterConfigData } from './types';

// 区块统一的进入动画变体
const footerSectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

interface FooterProps {
  staticConfig?: FooterConfigData;
  staticSocial?: Record<string, string>;
  copyrightConfig?: { license?: string; licenseUrl?: string };
}

export default function Footer({ staticConfig, staticSocial, copyrightConfig }: FooterProps) {
  const { config, error } = useFooterConfig(staticConfig, staticSocial);

  // 解析后的最终值
  const {
    links,
    badges,
    typedText,
    typedTextPrefix,
    typedTextSpeed,
    scrollToTopText,
    owner,
    author,
    customText,
    runtimeEnable,
    launchTime,
    timeFormat,
    onlineHours,
    statusText,
  } = resolveDefaults(config);

  return (
    <footer className="relative overflow-hidden">
      {/* 顶部渐变过渡 — 从页面背景色过渡到页脚色 */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-zinc-50 dark:from-zinc-900 to-transparent pointer-events-none z-10" />
      <div className="relative bg-zinc-50 dark:bg-zinc-800">
      <div className="relative max-w-5xl mx-auto px-6 pt-0 md:pt-16 pb-0 space-y-8">
        {/* 1. 链接组（移动端隐藏，仅桌面端显示） */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="hidden md:block"
        >
          <FooterLinkGroups groups={links} />
        </motion.div>

        {/* 2. 技术栈徽章（移动端隐藏） */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="hidden md:block"
        >
          <FooterBadges badges={badges} />
        </motion.div>

        {/* 3. 运行时状态（移动端隐藏） */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="hidden md:block"
        >
          <FooterRuntimeStatus
            launchTime={launchTime}
            enable={runtimeEnable}
            timeFormat={timeFormat}
            onlineHours={onlineHours}
            statusText={statusText}
          />
        </motion.div>

        {/* 间隔（仅桌面端） */}
        <div className="hidden md:block pb-8" />
      </div>

      {/* 4. 版权底栏 + 回到顶部 */}
      <FooterBar
        owner={owner}
        author={author}
        customText={customText}
        typedTextPrefix={typedTextPrefix}
        typedText={typedText}
        typedTextSpeed={typedTextSpeed}
        scrollToTopText={scrollToTopText}
        license={copyrightConfig?.license}
        licenseUrl={copyrightConfig?.licenseUrl}
      />

      {/* 错误提示：仅在完全无法加载配置时显示 */}
      {error && !config && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400">
          {error}
        </div>
      )}
      </div>
    </footer>
  );
}
