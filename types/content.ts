/** 文章翻译版本信息 */
export interface TranslationEntry {
  /** 目标语言代码（如 'en', 'zh-CN'） */
  lang: string;
  /** 翻译版本的路径（如 /posts/en/english-article） */
  slug: string;
}

/** 内容文件的元数据 */
export interface ContentMeta {
  title: string;
  date?: string;
  author?: string;
  tags?: string[];
  cover?: string;
  description?: string;
  /** 文章语言（默认 'zh-CN'） */
  lang?: string;
  /** 翻译版本映射：语言代码 → 路径 */
  translations?: Record<string, string>;
  // 允许动态属性（用于扩展字段）
  [key: string]: string | number | boolean | string[] | Record<string, string> | undefined;
}

/** 解析后的内容文件 */
export interface ContentFile {
  slug: string;
  meta: ContentMeta;
  content: string;
  raw: string;
}

/** 目录索引信息（来自 index.md 或 index.tsx） */
export interface ContentIndex {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
  children: ContentFile[];
}

export interface Article {
  id: string;
  title: string;
  content?: string;
  authorName: string;
  authorAvatar?: string;
  tags: string[];
  coverImage?: string;
  createdAt: string;
  status: string;
}
