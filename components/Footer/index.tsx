// Footer - 页脚主组件
// 负责装配：链接组、徽章、运行时状态、版权底栏（含回到顶部）。
// 所有配置加载、默认值兜底、动画变体均来自 footer-config / 子组件本身。

'use client';

import React from 'react';
import { motion } from 'motion/react';

import { FooterLinkGroups, FooterBadges } from './FooterLinks';
import { FooterRuntimeStatus } from './FooterBrand';
import { FooterBar } from './FooterCopyright';
import {
  useFooterConfig,
  defLinks,
  defBadges,
  defTypedText,
  defTypedTextPrefix,
  defOwner,
  defAuthor,
  defCustomText,
  defRuntimeEnable,
  defLaunchTime,
} from './footer-config';

// 区块统一的进入动画变体
const footerSectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function Footer() {
  const { config, error } = useFooterConfig();

  // 解析后的最终值
  const links = defLinks(config);
  const badges = defBadges(config);
  const typedText = defTypedText(config);
  const typedTextPrefix = defTypedTextPrefix(config);
  const owner = defOwner(config);
  const author = defAuthor(config);
  const customText = defCustomText(config);
  const runtimeEnable = defRuntimeEnable(config);
  const launchTime = defLaunchTime(config);

  return (
    <footer className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-800">
      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-0 space-y-8">
        {/* 1. 链接组 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterLinkGroups groups={links} />
        </motion.div>

        {/* 2. 技术栈徽章 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterBadges badges={badges} />
        </motion.div>

        {/* 3. 运行时状态 */}
        <motion.div
          variants={footerSectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <FooterRuntimeStatus launchTime={launchTime} enable={runtimeEnable} />
        </motion.div>

        {/* 间隔 */}
        <div className="pb-8" />
      </div>

      {/* 4. 版权底栏 + 回到顶部 */}
      <FooterBar
        owner={owner}
        author={author}
        customText={customText}
        typedTextPrefix={typedTextPrefix}
        typedText={typedText}
      />

      {/* 错误提示：仅在完全无法加载配置时显示 */}
      {error && !config && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-red-400">
          {error}
        </div>
      )}
    </footer>
  );
}
