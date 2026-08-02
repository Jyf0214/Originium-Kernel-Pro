'use client';

import React from 'react';
import { Select, ColorPicker } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import type { Color } from 'antd/es/color-picker';

/** 加载动画类型 */
export type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd' | 'progress';

/** 加载动画位置 */
export type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** 轻加载配置 */
export interface PageLoadingConfig {
  type: LoadingType;
  color: string;
  position: LoadingPosition;
}

/** 重加载配置 */
export interface NavigationLoadingConfig {
  type: LoadingType;
  color: string;
}

/** 加载动画配置属性 */
export interface LoadingAnimationConfigProps {
  /** 轻加载配置 */
  pageConfig: PageLoadingConfig;
  /** 重加载配置 */
  navigationConfig: NavigationLoadingConfig;
  /** 轻加载类型变更回调 */
  onPageTypeChange: (type: LoadingType) => void;
  /** 轻加载颜色变更回调 */
  onPageColorChange: (color: Color) => void;
  /** 轻加载位置变更回调 */
  onPagePositionChange: (position: LoadingPosition) => void;
  /** 重加载类型变更回调 */
  onNavigationTypeChange: (type: LoadingType) => void;
  /** 重加载颜色变更回调 */
  onNavigationColorChange: (color: Color) => void;
}

/** 动画类型选项（组件内部使用，支持 i18n） */
function useLoadingTypeOptions(t: (key: string) => string) {
  return [
    { value: 'spinner', label: t('loadingPreview.spinner') },
    { value: 'antd', label: t('loadingPreview.antd') },
    { value: 'text', label: t('loadingPreview.text') },
    { value: 'dots', label: t('loadingPreview.dots') },
    { value: 'glow', label: t('loadingPreview.glow') },
    { value: 'waves', label: t('loadingPreview.waves') },
    { value: 'progress', label: t('loadingPreview.progress') },
  ];
}

/** 位置选项（组件内部使用，支持 i18n） */
function usePositionOptions(t: (key: string) => string) {
  return [
    { value: 'center', label: t('loadingPreview.center') },
    { value: 'top-left', label: t('loadingPreview.topLeft') },
    { value: 'top-right', label: t('loadingPreview.topRight') },
    { value: 'bottom-left', label: t('loadingPreview.bottomLeft') },
    { value: 'bottom-right', label: t('loadingPreview.bottomRight') },
  ];
}

/**
 * 加载动画配置组件
 * 包含轻加载设置（类型、颜色、位置）和重加载设置（类型、颜色）
 * 使用 Select、ColorPicker 组件
 */
export function LoadingAnimationConfig({
  pageConfig,
  navigationConfig,
  onPageTypeChange,
  onPageColorChange,
  onPagePositionChange,
  onNavigationTypeChange,
  onNavigationColorChange,
}: LoadingAnimationConfigProps) {
  const { t } = useI18n();
  const loadingTypeOptions = useLoadingTypeOptions(t);
  const positionOptions = usePositionOptions(t);

  return (
    <div className="space-y-6">
      {/* 轻加载设置 */}
      <div className="p-4 bg-zinc-50 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-700 mb-3">
          {t('loadingPreview.pageLoading')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 动画类型 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.animationType')}
            </label>
            <Select
              value={pageConfig.type}
              onChange={onPageTypeChange}
              options={loadingTypeOptions}
              style={{ width: '100%' }}
              placement="bottomLeft"
            />
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.colorLabel')}
            </label>
            <ColorPicker
              value={pageConfig.color}
              onChange={onPageColorChange}
              showText
            />
          </div>

          {/* 位置选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.positionLabel')}
            </label>
            <Select
              value={pageConfig.position}
              onChange={onPagePositionChange}
              options={positionOptions}
              style={{ width: '100%' }}
              placement="bottomLeft"
            />
          </div>
        </div>
      </div>

      {/* 重加载设置 */}
      <div className="p-4 bg-zinc-50 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-700 mb-3">
          {t('loadingPreview.navLoading')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 动画类型 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.animationType')}
            </label>
            <Select
              value={navigationConfig.type}
              onChange={onNavigationTypeChange}
              options={loadingTypeOptions}
              style={{ width: '100%' }}
              placement="bottomLeft"
            />
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.colorLabel')}
            </label>
            <ColorPicker
              value={navigationConfig.color}
              onChange={onNavigationColorChange}
              showText
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingAnimationConfig;
