// SearchDialog 模块共用类型定义
// 所有搜索相关的数据接口与对话框属性均在此集中声明。

/** 搜索区域分组标题的统一样式 */
export const SECTION_TITLE_CLASS = 'text-[11px] font-bold uppercase tracking-widest text-zinc-400';

/** 单条搜索结果 */
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  tags: string[];
  slug: string;
  matchPreview: string;
  type: 'post' | 'diary';
}

/** 按类型分组的搜索结果 */
export interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

/** /api/search 接口响应结构 */
export interface SearchResponse {
  results: SearchResult[];
  groups: SearchGroup[];
}

/** 搜索对话框属性 */
export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}
