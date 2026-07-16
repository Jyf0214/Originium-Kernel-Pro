export interface PostItem {
  slug: string;
  title: string;
  date?: string;
  author?: string;
  /** 作者头像（来自 authors.yaml） */
  authorAvatar?: string;
  /** 作者昵称（来自 authors.yaml） */
  authorNickname?: string;
  tags: string[];
  cover?: string;
  description?: string;
  pinned?: boolean;
  /** 预估阅读时间（分钟） */
  readingTime?: number;
}

export interface CoverConfig {
  indexEnable?: boolean;
  asideEnable: boolean;
  position: string;
}
