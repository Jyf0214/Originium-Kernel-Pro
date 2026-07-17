// TOC 相关类型定义

export interface TOCConfig {
  number?: boolean;
  expand?: boolean;
  styleSimple?: boolean;
}

export interface TOCProps {
  content: string;
  config?: TOCConfig;
  locale?: string;
  /** 是否显示移动端浮动按钮 UI（默认 true）；设为 false 时仅渲染桌面端 sticky 侧栏 */
  showMobileUI?: boolean;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface TocNode {
  id: string;
  text: string;
  level: number;
  children: TocNode[];
}

export interface TocItemProps {
  items: TocNode[];
  activeId: string;
  depth?: number;
  numbering?: boolean;
  prefix?: string;
  onLinkClick?: () => void;
}
