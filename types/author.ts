/** 作者信息 — 从 authors/authors.yaml 加载，仅用于前端展示 */
export interface AuthorInfo {
  /** 作者唯一标识（与 frontmatter 中 author 字段匹配） */
  name: string;
  /** 显示昵称（可选，默认使用 name） */
  nickname?: string;
  /** 头像路径（相对 public/ 或绝对 URL） */
  avatar?: string;
  /** 所在地 */
  location?: string;
  /** 简短留言/签名 */
  bio?: string;
  /** 是否启用作者状态卡片 */
  enable?: boolean;
  /** 状态图片 URL */
  statusImg?: string;
  /** 技能标签列表 */
  skills?: string[];
}
