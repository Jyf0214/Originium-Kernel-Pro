// useNetworkAware - 网络感知 hook
// 根据 Network Information API 判断连接质量，返回自适应 rootMargin。
// 低速网络或省流模式下延迟加载距离缩短，节省带宽。

'use client';

import { useEffect, useState } from 'react';

/** 网络质量等级 */
type NetworkQuality = 'fast' | 'normal' | 'slow';

interface NetworkAwareState {
  /** 网络质量等级 */
  quality: NetworkQuality;
  /** 是否开启省流模式 */
  saveData: boolean;
  /** 基于网络质量的 rootMargin 值 */
  rootMargin: string;
}

/**
 * 检测当前网络质量，返回自适应 rootMargin。
 *
 * - 4G 非省流：提前 400px 加载（快速网络可以预加载更多）
 * - 3G / 默认：提前 200px 加载
 * - 2G / 省流：仅在距离 50px 时加载（节省带宽）
 */
function detectNetwork(): NetworkAwareState {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { quality: 'normal', saveData: false, rootMargin: '200px 0px' };
  }

  const conn = (navigator as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!conn) {
    return { quality: 'normal', saveData: false, rootMargin: '200px 0px' };
  }

  const saveData = conn.saveData === true;
  const effectiveType = conn.effectiveType ?? '4g';

  let quality: NetworkQuality;
  let rootMargin: string;

  if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
    quality = 'slow';
    rootMargin = '50px 0px';
  } else if (effectiveType === '3g') {
    quality = 'normal';
    rootMargin = '200px 0px';
  } else {
    // 4g 或未知（默认为快）
    quality = 'fast';
    rootMargin = '400px 0px';
  }

  return { quality, saveData, rootMargin };
}

/**
 * 网络感知 hook
 *
 * 监听 navigator.connection 的 change 事件，网络状态变化时自动更新。
 * 浏览器不支持 Network Information API 时降级为默认值（200px）。
 *
 * @param overrideRootMargin 如果提供，忽略网络检测结果，使用指定值
 * @returns 网络质量状态和自适应 rootMargin
 */
export function useNetworkAware(overrideRootMargin?: string): NetworkAwareState {
  const [state, setState] = useState<NetworkAwareState>(() => {
    if (overrideRootMargin) {
      return { quality: 'normal', saveData: false, rootMargin: overrideRootMargin };
    }
    return detectNetwork();
  });

  useEffect(() => {
    if (overrideRootMargin) {
      setState({ quality: 'normal', saveData: false, rootMargin: overrideRootMargin });
      return;
    }

    // 初始检测
    setState(detectNetwork());

    // 监听连接变化
    if (!('connection' in navigator)) return;

    const conn = (navigator as { connection?: EventTarget }).connection;
    if (!conn) return;

    const handleChange = () => {
      setState(detectNetwork());
    };

    conn.addEventListener('change', handleChange);
    return () => {
      conn.removeEventListener('change', handleChange);
    };
  }, [overrideRootMargin]);

  return state;
}
