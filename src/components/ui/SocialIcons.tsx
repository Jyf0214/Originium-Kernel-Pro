/**
 * 社交平台图标 — 基于 Simple Icons（品牌）+ Lucide（通用）
 * 统一入口，避免多处重复定义
 */
import React from 'react';
import { SiX, SiFacebook, SiSinaweibo, SiWechat, SiQq, SiTelegram, SiWhatsapp, SiReddit } from '@icons-pack/react-simple-icons';

interface IconProps {
  size?: number;
  className?: string;
}

export function TwitterIcon({ size = 20, className }: IconProps) {
  return <SiX size={size} className={className} title="X / Twitter" />;
}

export function FacebookIcon({ size = 20, className }: IconProps) {
  return <SiFacebook size={size} className={className} title="Facebook" />;
}

export function WeiboIcon({ size = 20, className }: IconProps) {
  return <SiSinaweibo size={size} className={className} title="微博" />;
}

export function WeChatIcon({ size = 20, className }: IconProps) {
  return <SiWechat size={size} className={className} title="微信" />;
}

export function QQIcon({ size = 20, className }: IconProps) {
  return <SiQq size={size} className={className} title="QQ" />;
}

export function TelegramIcon({ size = 20, className }: IconProps) {
  return <SiTelegram size={size} className={className} title="Telegram" />;
}

export function WhatsAppIcon({ size = 20, className }: IconProps) {
  return <SiWhatsapp size={size} className={className} title="WhatsApp" />;
}

export function RedditIcon({ size = 20, className }: IconProps) {
  return <SiReddit size={size} className={className} title="Reddit" />;
}

export function LinkedInIcon({ size = 20, className }: IconProps) {
  return (
    <svg // no-inline-svg-ok
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function EmailIcon({ size = 20, className }: IconProps) {
  return (
    <svg // no-inline-svg-ok
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Email</title>
      <rect x={2} y={4} width={20} height={16} rx={2} />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
