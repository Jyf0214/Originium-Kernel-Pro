/**
 * 社交平台图标 — 基于 Simple Icons（品牌）+ Lucide（通用）
 * 统一入口，避免 3 处重复定义
 */
import React from 'react';
import { SiX, SiFacebook, SiSinaweibo, SiWechat, SiQq, SiTelegram } from '@icons-pack/react-simple-icons';

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
