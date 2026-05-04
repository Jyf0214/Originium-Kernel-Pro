/** 内容文件的元数据 */
export interface ContentMeta {
  title: string;
  date?: string;
  author?: string;
  tags?: string[];
  cover?: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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
