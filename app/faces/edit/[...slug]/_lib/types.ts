import type { ContentFile } from '@/types/content';

/** 表单字段值类型 */
export interface FormValues {
  name: string;
  email: string;
  phone: string;
  group: string;
  content: string;
}

/** 分组选项(来自 /api/faces indexes) */
export interface GroupOption {
  slug: string;
  title: string;
  groupName: string;
}

/** 视图模型:封装 page.tsx 需要的全部状态 */
export interface EditFaceViewModel {
  fullPath: string;
  filePath: string;
  file: ContentFile | null;
  groups: GroupOption[];
  loading: boolean;
  submitting: boolean;
  deleting: boolean;
}
